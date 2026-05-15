class Authorizer
  include AuthorizerCache

  MAX_AUTHORIZATION_SEARCH_LENGTH = 65_536

  attr_reader :user
  attr_accessor :base_collection, :organization_ids, :location_ids

  def initialize(user, options = {})
    initialize_cache
    @user = user
    @base_collection = options.delete(:collection)
  end

  # Check if the current user has a specific permission on the subject.
  # First parameter is the permission to check.
  # Second parameter is the subject record which must have an id field.
  # If subject is not passed, this method checks if the user has the given permission.
  # Third parameter is if the allowed resources for the permission should be cached.
  # This is useful if we need to check multiple subjects against the same permission.
  # Caching increases memory load and should be avoided for resources that could have millions of records.
  def can?(permission, subject = nil, cache = true)
    return false if user.nil? || user.disabled?
    return true if user.admin?

    if subject.nil?
      user.permissions.exists?(:name => permission)
    else
      return collection_cache_lookup(subject, permission) if cache

      find_collection(subject.class, :permission => permission).
        exists?(subject.id)
    end
  end

  def find_collection(resource_class, options = {})
    permission = options.delete :permission
    resource_class = Host if resource_class == Host::Base
    metrics = {}
    request_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)

    Foreman::Logging.logger('permissions').debug "checking permission #{permission} for class #{resource_class}"

    # retrieve all filters relevant to this permission for the user
    base_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    base = user.filters.joins(:permissions).where(permissions: {resource_type: resource_name(resource_class)})
    all_filters = permission.nil? ? base : base.where(permissions: {name: permission})
    metrics[:base_scope_ms] = elapsed_milliseconds_since(base_started_at)

    organizations_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    organization_ids = allowed_organizations(resource_class)
    metrics[:allowed_organizations_ms] = elapsed_milliseconds_since(organizations_started_at)
    Foreman::Logging.logger('permissions').debug "organization_ids: #{organization_ids.inspect}"
    locations_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    location_ids = allowed_locations(resource_class)
    metrics[:allowed_locations_ms] = elapsed_milliseconds_since(locations_started_at)
    Foreman::Logging.logger('permissions').debug "location_ids: #{location_ids.inspect}"

    taxonomy_filter_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    organizations, locations, values = taxonomy_conditions(organization_ids, location_ids)
    all_filters = all_filters.joins(taxonomy_join).where(["#{TaxableTaxonomy.table_name}.id IS NULL " +
                                                              "OR (#{organizations}) " +
                                                              "OR (#{locations})",
                                                          *values]).distinct
    metrics[:taxonomy_filter_ms] = elapsed_milliseconds_since(taxonomy_filter_started_at)

    filter_load_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    all_filters = all_filters.reorder(nil).to_a # load all records, so #empty? does not call extra COUNT(*) query
    metrics[:filter_load_ms] = elapsed_milliseconds_since(filter_load_started_at)
    metrics[:filter_count] = all_filters.size
    Foreman::Logging.logger('permissions').debug do
      all_filters.map do |f|
        "filter with role_id: #{f.role_id} limited: #{f.search.present?} search: #{f.search} taxonomy_search: #{f.taxonomy_search}"
      end.join("\n")
    end

    # retrieve hash of scoping data parsed from filters (by scoped_search), e.g. where clauses, joins
    scope_components_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    scope_components = build_filtered_scope_components(resource_class, all_filters, options)
    metrics[:scope_components_ms] = elapsed_milliseconds_since(scope_components_started_at)
    metrics.merge!(scope_components.delete(:metrics) || {})

    scope_build_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    if options[:joined_on]
      # build scope for the "joined_on" object filtered by the associated "resource_class"
      assoc = options[:joined_on].reflect_on_association(options[:association_name]) if options[:association_name]
      assoc ||= options[:joined_on].reflect_on_all_associations.find { |a| a.klass.base_class == resource_class.base_class }

      # allow user to add their own further clauses
      scope_components[:where] << options[:where] if options[:where].present?

      scope = options[:joined_on].joins(assoc.name)
      if scope_components[:where].present?
        # Get a subselect based on the scope search criteria
        subselect = resource_class.left_outer_joins(scope_components[:includes])
        subselect = scope_components[:where].inject(subselect) { |scope_build, where| scope_build.where(where) }
        scope = scope.where(assoc.foreign_key => subselect)
      end

      final_scope = scope.readonly(false)
    else
      # build regular filtered scope for "resource_class"
      scope = resource_class
      if scope_components[:includes].present?
        scope = scope.eager_load(scope_components[:includes])
      end

      scope = scope.joins(scope_components[:joins]).readonly(false)
      final_scope = scope_components[:where].inject(scope) { |scope_build, where| scope_build.where(where) }
    end

    metrics[:scope_build_ms] = elapsed_milliseconds_since(scope_build_started_at)
    metrics[:total_ms] = elapsed_milliseconds_since(request_started_at)
    log_find_collection_metrics(resource_class, permission, metrics)

    final_scope
  end

  def build_filtered_scope_components(resource_class, all_filters, options)
    result = { where: [], includes: [], joins: [], metrics: {} }

    if all_filters.empty? || (!@base_collection.nil? && @base_collection.empty?)
      Foreman::Logging.logger('permissions').debug 'no filters found for given permission' if all_filters.empty?
      Foreman::Logging.logger('permissions').debug 'base collection of objects is empty' if !@base_collection.nil? && @base_collection.empty?
      result[:where] << (user.admin? ? '1=1' : '1=0')
      return result
    end

    result[:where] << { id: base_ids } if @base_collection.present?

    search_string = build_scoped_search_condition(all_filters)
    return result if search_string.blank?

    metrics = authorization_search_metrics(all_filters, search_string)
    if search_string.length > MAX_AUTHORIZATION_SEARCH_LENGTH
      deny_authorization_due_to_complex_search(result,
        "Authorization search expression too large (#{search_string.length} chars, " \
        "#{all_filters.size} filters) for #{resource_class.name} - denying access. " \
        "Consider reducing the number of roles, filters, or taxonomy assignments for user '#{user.login}'.",
        :warn)
      return result
    end

    begin
      build_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      find_options = ScopedSearch::QueryBuilder.build_query(resource_class.scoped_search_definition, search_string, options)
      result[:metrics].merge!(metrics)
      result[:metrics][:build_query_ms] = elapsed_milliseconds_since(build_started_at)

      result[:where] << find_options[:conditions]
      includes = Array.wrap(find_options[:include]) - [:organizations, :locations]
      result[:includes].push(*includes)
      result[:joins].push(*find_options[:joins])
    rescue ScopedSearch::QueryNotSupported => e
      Foreman::Logging.logger('permissions').error "Scoped search query not supported: #{e.message}"
      result[:where] << '1=0' unless user.admin?
    rescue SystemStackError
      deny_authorization_due_to_complex_search(result,
        "Authorization search expression caused stack overflow (#{search_string.length} chars, " \
        "#{all_filters.size} filters) for #{resource_class.name} - denying access. " \
        "The scoped search expression is too deeply nested. " \
        "Consider reducing the number of roles, filters, or taxonomy assignments for user '#{user.login}'.")
    end

    result
  end

  def build_scoped_search_condition(filters)
    raise ArgumentError if filters.blank?

    if filters.all?(&:granular?)
      # All the filters support granular filtering
      #
      # This means we can build a simplified query by OR-ing all the per-filter
      # searches together and then AND-ing a single check for user's taxonomies

      # Do not do any scoping if there's a filter which grants the permission universally
      base_conditions = grouped_granular_filter_conditions(filters)
      tax_conditions = filters.first.taxonomy_search_condition_for_user(@user)

      QueryBuilder.join(
        'AND',
        [
          base_conditions,
          QueryBuilder.join('AND', tax_conditions),
        ])
    else
      # At least one of the filters does not support granular filtering. This is
      # probably the less common case
      #
      # This means we cannot take any shortcuts and need to build a query where
      # the checks for user's taxonomies are evaluated for each filter
      # individually
      conditions = filters.map { |f| f.search_condition_for_user(@user) }
      QueryBuilder.join('OR', conditions)
    end
  end

  private

  def deny_authorization_due_to_complex_search(result, message, level = :error)
    Foreman::Logging.logger('permissions').public_send(level, message)
    result[:where] << '1=0'
  end

  def grouped_granular_filter_conditions(filters)
    return nil if filters.any? { |filter| filter.taxonomy_search.blank? && filter.search.blank? }

    grouped_conditions = grouped_granular_filters(filters).map do |grouped_filters|
      build_grouped_granular_filter_condition(grouped_filters, grouped_filters.first.taxonomy_search)
    end

    QueryBuilder.join('OR', grouped_conditions)
  end

  def grouped_granular_filters(filters)
    filters.group_by { |filter| normalized_granular_filter_group_key(filter) }.values
  end

  def build_grouped_granular_filter_condition(filters, taxonomy_search)
    return taxonomy_search if filters.any? { |filter| filter.search.blank? }

    searches = filters.map(&:search).uniq
    search_condition = QueryBuilder.join('OR', searches)
    return search_condition if taxonomy_search.blank?

    QueryBuilder.join('AND', [search_condition, taxonomy_search])
  end

  def normalized_granular_filter_group_key(filter)
    @normalized_group_keys ||= {}
    cache_key = filter.taxonomy_search.presence

    @normalized_group_keys[cache_key] ||= filter.taxonomy_search_condition_for_user(@user, filter.taxonomy_search).map do |condition|
      normalize_taxonomy_group_condition(condition)
    end
  end

  def authorization_search_metrics(filters, search_string)
    metrics = {
      filter_count: filters.size,
      search_length: search_string.length,
    }
    metrics[:grouped_filter_count] = grouped_granular_filters(filters).size if filters.all?(&:granular?)
    metrics
  end

  def log_find_collection_metrics(resource_class, permission, metrics)
    Rails.logger.info do
      parts = [
        "authorization search metrics for #{resource_class.name}",
        "permission=#{permission || 'any'}",
        "filters=#{metrics[:filter_count]}",
        "base_scope_ms=#{format_metric_duration(metrics[:base_scope_ms])}",
        "allowed_organizations_ms=#{format_metric_duration(metrics[:allowed_organizations_ms])}",
        "allowed_locations_ms=#{format_metric_duration(metrics[:allowed_locations_ms])}",
        "taxonomy_filter_ms=#{format_metric_duration(metrics[:taxonomy_filter_ms])}",
        "filter_load_ms=#{format_metric_duration(metrics[:filter_load_ms])}",
        "scope_components_ms=#{format_metric_duration(metrics[:scope_components_ms])}",
        "scope_build_ms=#{format_metric_duration(metrics[:scope_build_ms])}",
        "total_ms=#{format_metric_duration(metrics[:total_ms])}",
      ]
      parts << "grouped_filters=#{metrics[:grouped_filter_count]}" if metrics.key?(:grouped_filter_count)
      parts << "search_length=#{metrics[:search_length]}" if metrics.key?(:search_length)
      parts << "build_query_ms=#{format_metric_duration(metrics[:build_query_ms])}" if metrics.key?(:build_query_ms)
      parts.join(', ')
    end
  end

  def normalize_taxonomy_group_condition(condition)
    matches = condition.to_s.match(/\A(?<key>\w+_id) \^ \((?<ids>[\d,\s]+)\)\z/)
    return condition if matches.blank?

    ids = matches[:ids].split(',').map(&:to_i).uniq.sort
    QueryBuilder.key_value_in(matches[:key], ids)
  end

  def elapsed_milliseconds_since(started_at)
    (Process.clock_gettime(Process::CLOCK_MONOTONIC) - started_at) * 1000.0
  end

  def format_metric_duration(value)
    format('%.1f', value || 0.0)
  end

  def allowed_organizations(resource_class)
    allowed_taxonomies(resource_class, 'organization')
  end

  def allowed_locations(resource_class)
    allowed_taxonomies(resource_class, 'location')
  end

  # return array of taxonomies that were used by default scope
  # if model does not support taxonomies, we return empty array indicating
  #   we should not filter on taxonomies
  # otherwise we fetch it from model, if it's empty
  #   for admin user we return empty array which means don't limit
  #   for normal user we allow user taxonomies only
  def allowed_taxonomies(resource_class, type)
    taxonomy_ids = []
    if resource_class&.allows_taxonomy_filtering?("#{type}_id") &&
       resource_class.respond_to?("used_#{type}_ids")
      taxonomy_ids = used_taxonomy_ids_for(resource_class, type)
    end
    taxonomy_ids
  end

  def used_taxonomy_ids_for(resource_class, type)
    taxonomy_ids = resource_class.send("used_#{type}_ids")
    if taxonomy_ids.empty? && !user.try(:admin?)
      taxonomy_ids = user.try("#{type}_ids")
    end
    taxonomy_ids
  end

  def taxonomy_join
    "LEFT JOIN #{TaxableTaxonomy.table_name} ON " +
        "(#{Filter.table_name}.id = #{TaxableTaxonomy.table_name}.taxable_id AND taxable_type = 'Filter') " +
        "LEFT JOIN #{Taxonomy.table_name} ON " +
        "(#{Taxonomy.table_name}.id = #{TaxableTaxonomy.table_name}.taxonomy_id)"
  end

  def taxonomy_conditions(organization_ids, location_ids)
    values = []

    organizations = "#{Taxonomy.table_name}.type = ?"
    values.push 'Organization'
    unless organization_ids.empty?
      organizations += " AND #{Taxonomy.table_name}.id IN (?)"
      values.push organization_ids
    end

    locations = "#{Taxonomy.table_name}.type = ?"
    values.push 'Location'
    unless location_ids.empty?
      locations += " AND #{Taxonomy.table_name}.id IN (?)"
      values.push location_ids
    end

    [organizations, locations, values]
  end

  def resource_name(klass)
    Permission.resource_name(klass)
  end

  def base_ids
    raise ArgumentError, 'you must set base_collection to get base_ids' if @base_collection.nil?

    @base_ids ||= (@base_collection.all? { |i| i.is_a?(Integer) }) ? @base_collection : @base_collection.map(&:id)
  end
end

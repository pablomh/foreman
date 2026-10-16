class HostgroupInheritanceResolver
  def self.build_cache(hostgroups, associations: [])
    records = Array(hostgroups)
    return { :resolvers => {}, :ancestors => {} } if records.empty?

    preload_associations(records, associations)

    # Reuse already-loaded records as ancestors; only fetch the ids not on the page.
    index = records.index_by(&:id)
    missing_ids = records.flat_map(&:ancestor_ids).uniq - index.keys
    index.merge!(preload_ancestor_index(missing_ids, associations))

    records.each_with_object({ :resolvers => {}, :ancestors => {} }) do |hostgroup, cache|
      ancestors = hostgroup.ancestor_ids.filter_map { |ancestor_id| index[ancestor_id] }
      cache[:ancestors][hostgroup.id] = ancestors
      cache[:resolvers][hostgroup.id] = new(hostgroup, ancestors: ancestors)
    end
  end

  def self.preload_associations(records, associations)
    return if associations.blank?

    ActiveRecord::Associations::Preloader.new(records: records, associations: associations).call
  end

  def self.preload_ancestor_index(ancestor_ids, associations)
    return {} if ancestor_ids.empty?

    scope = Hostgroup.where(:id => ancestor_ids)
    scope = scope.includes(*associations) if associations.present?
    scope.to_a.index_by(&:id)
  end
  private_class_method :preload_associations, :preload_ancestor_index

  def initialize(hostgroup, ancestors: nil)
    @hostgroup = hostgroup
    @ancestors = normalized_ancestors(ancestors)
  end

  def inherited_attribute(attribute)
    attribute = attribute.to_sym
    return @hostgroup[attribute] unless @hostgroup.ancestry.present? && @hostgroup[attribute].nil?

    resolution_for(attribute)[:value]
  end

  def nested_attribute(attribute)
    return unless @hostgroup.ancestry.present?

    resolution_for(attribute.to_sym)[:value]
  end

  def source_for(attribute)
    return unless @hostgroup.ancestry.present?

    resolution_for(attribute.to_sym)[:source]
  end

  # Raw reader off the owning record (preloaded) - no re-entry, keeps STI subtype.
  def inherited_association(association_name, field)
    owner = @hostgroup[field].present? ? @hostgroup : source_for(field)
    owner&.association(association_name)&.reader
  end

  private

  # Callers pass already-ordered ancestors; only the fallback query needs sorting.
  # No size-vs-ancestor_ids check: under taxonomy scoping the set is legitimately
  # smaller, which made it misfire into a per-row reload.
  def normalized_ancestors(ancestors)
    ancestors || Hostgroup.sort_by_ancestry(@hostgroup.ancestors.to_a)
  end

  def resolution_for(attribute)
    @resolutions ||= {}
    return @resolutions[attribute] if @resolutions.key?(attribute)

    # @ancestors is ordered root-first, so the nearest ancestor with a value
    # is the last match - search backwards and stop at the first hit.
    source = @ancestors.reverse_each.find { |ancestor| !ancestor[attribute].nil? }
    @resolutions[attribute] = { :value => source&.[](attribute), :source => source }
  end
end

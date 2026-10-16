# Controller-owned, lazily built: batch-preloads a hostgroup collection's
# ancestors and inherited associations once and exposes the resolved inherited
# values to the views, without caching anything on the model.
class HostgroupInheritancePresenter
  PRELOAD_ASSOCIATIONS = [
    :architecture, :compute_profile, :compute_resource, :domain, :medium,
    :operatingsystem, :ptable, :realm, :subnet, :subnet6
  ].freeze

  def self.load(hostgroups, include_parameters: false)
    new(hostgroups, include_parameters: include_parameters).tap(&:load)
  end

  def initialize(hostgroups, include_parameters: false)
    @hostgroups = hostgroups
    @include_parameters = include_parameters
    @resolver_map = {}
    @ancestor_map = {}
  end

  def load
    return self if @hostgroups.blank?

    cache = HostgroupInheritanceResolver.build_cache(records, associations: preload_associations)
    @resolver_map = cache[:resolvers]
    @ancestor_map = cache[:ancestors]
    self
  end

  def inherited_id(hostgroup, field)
    resolver_for(hostgroup).inherited_attribute(field)
  end

  def inherited_association(hostgroup, association_name)
    resolver_for(hostgroup).inherited_association(association_name, :"#{association_name}_id")
  end

  def parent_title(hostgroup)
    return nil unless hostgroup.ancestry.present?

    parent_id = hostgroup.ancestor_ids.last
    Array(@ancestor_map[hostgroup.id]).find { |a| a.id == parent_id }&.title
  end

  def resolved_pxe_loader(hostgroup)
    hostgroup[:pxe_loader].presence || resolver_for(hostgroup).nested_attribute(:pxe_loader).presence
  end

  private

  def records
    @records ||= Array(@hostgroups).compact
  end

  def resolver_for(hostgroup)
    return @resolver_map[hostgroup.id] if hostgroup.id && @resolver_map.key?(hostgroup.id)

    resolver = HostgroupInheritanceResolver.new(hostgroup, ancestors: @ancestor_map[hostgroup.id])
    @resolver_map[hostgroup.id] = resolver if hostgroup.id
    resolver
  end

  def preload_associations
    associations = PRELOAD_ASSOCIATIONS.dup
    associations << :group_parameters if @include_parameters
    associations
  end
end

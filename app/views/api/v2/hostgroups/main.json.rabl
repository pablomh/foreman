object @hostgroup

extends "api/v2/hostgroups/base"
extends "api/v2/smart_proxies/children_nodes"

attributes :subnet_id, :operatingsystem_id, :domain_id, :compute_profile_id, :ancestry, :parent_id,
  :ptable_id, :medium_id, :subnet6_id, :compute_resource_id,
  :architecture_id, :realm_id, :created_at, :updated_at

# Inherited values resolved by the presenter (batch-preloaded), not the model.
[:subnet, :operatingsystem, :domain, :compute_profile, :ptable, :medium, :subnet6, :compute_resource, :architecture, :realm].each do |assoc|
  node(:"#{assoc}_name") { |hostgroup| hostgroup_presenter.inherited_association(hostgroup, assoc).try(:name_method) }
end

node(:pxe_loader) { |hostgroup| hostgroup_presenter.resolved_pxe_loader(hostgroup) }
node(:parent_name) { |hostgroup| hostgroup_presenter.parent_title(hostgroup) }

Hostgroup.nested_attribute_fields.each do |nested_field|
  node(:"inherited_#{nested_field}") { |hostgroup| hostgroup_presenter.inherited_id(hostgroup, nested_field) if hostgroup[nested_field].nil? }
end

if @parameters
  node do |hostgroup|
    { :parameters => partial("api/v2/parameters/index", :object => hostgroup.group_parameters.authorized) }
  end
end

@object.facet_definitions.each do |definition|
  next unless definition.api_list_view
  node(false, if: ->(hostgroup) { definition.facet_record_for(hostgroup) }) do |hostgroup|
    partial(definition.api_list_view, object: hostgroup, locals: { facet: definition.facet_record_for(hostgroup) })
  end
end

visible_locations = if defined?(@preauthorized_role_location_ids) && @preauthorized_role_location_ids
                      @object.locations.select { |location| @preauthorized_role_location_ids[location.id] }
                    else
                      @object.locations.merge(Location.my_locations).authorized_as(User.current, :view_locations, Location)
                    end

child visible_locations => :locations do
  extends "api/v2/taxonomies/base"
end

visible_organizations = if defined?(@preauthorized_role_organization_ids) && @preauthorized_role_organization_ids
                          @object.organizations.select { |organization| @preauthorized_role_organization_ids[organization.id] }
                        else
                          @object.organizations.merge(Organization.my_organizations).authorized_as(User.current, :view_organizations, Organization)
                        end

child visible_organizations => :organizations do
  extends "api/v2/taxonomies/base"
end

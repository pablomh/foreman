require 'test_helper'

class Api::V2::FiltersControllerTest < ActionController::TestCase
  test "should get index" do
    get :index
    assert_response :success
    assert_not_nil assigns(:filters)
    filters = ActiveSupport::JSON.decode(@response.body)
    assert !filters.empty?
  end

  test "index reuses preauthorized role taxonomies" do
    organization = FactoryBot.create(:organization)
    location = FactoryBot.create(:location)
    role = FactoryBot.create(:role, :name => "filter_taxonomy_role")
    role.organizations = [organization]
    role.locations = [location]
    role.add_permissions!([:view_filters, :view_locations, :view_organizations, :view_architectures])

    user = FactoryBot.create(:user, :organizations => [organization], :locations => [location])
    role.users << user
    role.save!

    filter = FactoryBot.create(:filter, :role => role, :permissions => [permissions(:view_architectures)])

    Location.expects(:authorized_as).never
    Organization.expects(:authorized_as).never

    as_user(user) do
      get :index
      assert_response :success
    end

    response_body = ActiveSupport::JSON.decode(@response.body)
    matching_filter = response_body['results'].detect { |item| item['id'] == filter.id }

    assert_not_nil matching_filter
    assert_equal [location.id], matching_filter.dig('role', 'locations').map { |taxonomy| taxonomy['id'] }
    assert_equal [organization.id], matching_filter.dig('role', 'organizations').map { |taxonomy| taxonomy['id'] }
  end

  test "should show individual record" do
    get :show, params: { :id => filters(:manager_1).to_param }
    assert_response :success
    show_response = ActiveSupport::JSON.decode(@response.body)
    assert !show_response.empty?
  end

  test_attributes :pid => 'b8631d0a-a71a-41aa-9f9a-d12d62adc496'
  test "should create filter" do
    valid_attrs = { :role_id => roles(:destroy_hosts).id, :permission_ids => [permissions(:view_architectures).id] }
    assert_difference('Filter.count') do
      post :create, params: { :filter => valid_attrs }
    end
    assert_response :created
    show_response = ActiveSupport::JSON.decode(@response.body)
    assert_equal show_response["permissions"].first["name"], "view_architectures"
  end

  test "should create filter with scoped organization" do
    role = FactoryBot.create(:role, :organization_ids => [taxonomies(:organization1).id], :name => "role_test")

    filter = { :role_id => role.id, :permission_ids => [permissions(:view_architectures).id]}
    assert_difference('Filter.count') do
      post :create, params: { :filter => filter, :organization_id => taxonomies(:organization1).id}
    end
    assert_response :created
    show_response = ActiveSupport::JSON.decode(@response.body)
    assert_equal show_response["permissions"].first["name"], "view_architectures"
  end

  test "should update filter" do
    valid_attrs = { :role_id => roles(:destroy_hosts).id, :permission_ids => [permissions(:create_hosts).id] }
    put :update, params: { :id => filters(:destroy_hosts_1).to_param, :filter => valid_attrs }
    assert_response :success
  end

  test_attributes :pid => 'f0c56fd8-c91d-48c3-ad21-f538313b17eb'
  test "should destroy filters" do
    assert_difference('Filter.count', -1) do
      delete :destroy, params: { :id => filters(:destroy_hosts_1).to_param }
    end
    assert_response :success
  end
end

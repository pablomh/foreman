require 'test_helper'

class HostgroupCountsPresenterTest < ActiveSupport::TestCase
  setup do
    User.current = users(:admin)
  end

  test "counts are correct whether or not scoped to the given hostgroups" do
    parent = FactoryBot.create(:hostgroup, :with_os, :with_domain)
    child = FactoryBot.create(:hostgroup, :parent => parent)
    FactoryBot.create_list(:host, 2, :managed, :hostgroup => parent)
    FactoryBot.create_list(:host, 3, :managed, :hostgroup => child)

    scoped = HostgroupCountsPresenter.load([parent, child], scope_to_given: true)
    unscoped = HostgroupCountsPresenter.load([parent, child], scope_to_given: false)

    assert_equal scoped.direct_host_count_for(parent), unscoped.direct_host_count_for(parent)
    assert_equal scoped.subtree_host_count_for(parent), unscoped.subtree_host_count_for(parent)
    assert_equal 5, unscoped.subtree_host_count_for(parent)
    assert_equal 3, unscoped.subtree_host_count_for(child)
  end
end

require 'test_helper'

class HostgroupInheritancePresenterTest < ActiveSupport::TestCase
  setup do
    User.current = users(:admin)
  end

  test "resolves inherited ids and associations with no queries after load" do
    child = hostgroups(:inherited)
    parent = hostgroups(:parent)
    expected_os_id = parent.operatingsystem_id
    expected_os = parent.operatingsystem
    expected_arch = parent.architecture
    presenter = HostgroupInheritancePresenter.load([child])

    assert_sql_queries(0) do
      assert_equal expected_os_id, presenter.inherited_id(child, :operatingsystem_id)
      assert_equal expected_os, presenter.inherited_association(child, :operatingsystem)
      assert_equal expected_arch, presenter.inherited_association(child, :architecture)
    end
  end

  test "own value wins over inherited" do
    child = hostgroups(:inherited)
    presenter = HostgroupInheritancePresenter.load([child])
    refute_nil child.domain_id

    assert_equal child.domain_id, presenter.inherited_id(child, :domain_id)
    assert_equal child.domain, presenter.inherited_association(child, :domain)
  end

  test "parent_title comes from preloaded ancestors without queries" do
    child = hostgroups(:inherited)
    expected_title = hostgroups(:parent).title
    presenter = HostgroupInheritancePresenter.load([child])

    assert_sql_queries(0) do
      assert_equal expected_title, presenter.parent_title(child)
    end
  end

  test "inherited_association keeps the stored subnet STI subtype" do
    as_admin do
      subnet = FactoryBot.create(:subnet_ipv4)
      parent = FactoryBot.create(:hostgroup, :subnet => subnet)
      child = FactoryBot.create(:hostgroup, :parent => parent)
      presenter = HostgroupInheritancePresenter.load([child])

      resolved = presenter.inherited_association(child, :subnet)
      assert_equal subnet, resolved
      assert_equal 'Subnet::Ipv4', resolved.type
    end
  end

  test "resolved_pxe_loader applies presence and inheritance" do
    as_admin do
      parent = FactoryBot.create(:hostgroup, pxe_loader: 'Grub2 UEFI')
      child = FactoryBot.create(:hostgroup, parent: parent, pxe_loader: nil)
      presenter = HostgroupInheritancePresenter.load([child, parent])

      assert_equal 'Grub2 UEFI', presenter.resolved_pxe_loader(child)
      assert_equal 'Grub2 UEFI', presenter.resolved_pxe_loader(parent)
    end
  end

  test "unsaved records do not collide on a nil id" do
    a = Hostgroup.new(domain_id: domains(:yourdomain).id)
    b = Hostgroup.new
    presenter = HostgroupInheritancePresenter.load([a, b])

    assert_equal a.domain_id, presenter.inherited_id(a, :domain_id)
    assert_nil presenter.inherited_id(b, :domain_id)
  end

  test "resolution over a deep page issues no per-row queries (O(1))" do
    as_admin do
      root = FactoryBot.create(:hostgroup, :with_os)
      mid = FactoryBot.create(:hostgroup, :with_domain, :parent => root) # value on a NON-root ancestor
      leaves = FactoryBot.create_list(:hostgroup, 5, :parent => mid)
      page = [root, mid] + leaves
      presenter = HostgroupInheritancePresenter.load(page)
      name_assocs = [:domain, :operatingsystem, :subnet]

      assert_sql_queries(0) do
        page.each do |hg|
          Hostgroup.nested_attribute_fields.each { |f| presenter.inherited_id(hg, f) if hg[f].nil? }
          name_assocs.each { |a| presenter.inherited_association(hg, a).try(:name_method) }
          presenter.parent_title(hg)
        end
      end
    end
  end
end

require 'test_helper'

class HostgroupInheritanceResolverTest < ActiveSupport::TestCase
  setup { User.current = users(:admin) }

  # Regression for the taxonomy-scoped ancestor N+1: a non-admin viewer sees fewer
  # ancestors than ancestor_ids, so the preloaded set is a strict subset. The
  # resolver must trust that partial set and not reload it per row (the measured
  # production bug) - and must not resolve values off the dropped ancestors.
  test "trusts a partial ancestor set without reloading or reading dropped ancestors" do
    as_admin do
      grandparent = FactoryBot.create(:hostgroup, :with_os)
      parent = FactoryBot.create(:hostgroup, :with_domain, :parent => grandparent)
      child = FactoryBot.create(:hostgroup, :parent => parent)
      assert_equal 2, child.ancestor_ids.size

      # Only parent is visible; grandparent is dropped, as taxonomy scoping would.
      resolver = HostgroupInheritanceResolver.new(child, :ancestors => [parent])

      assert_sql_queries(0) do
        assert_equal parent.domain_id, resolver.inherited_attribute(:domain_id)
        assert_nil resolver.inherited_attribute(:operatingsystem_id)
      end
    end
  end

  test "inherited_association reads the visible ancestor and not a dropped one" do
    as_admin do
      grandparent = FactoryBot.create(:hostgroup, :with_os)
      parent = FactoryBot.create(:hostgroup, :with_domain, :parent => grandparent)
      child = FactoryBot.create(:hostgroup, :parent => parent)

      resolver = HostgroupInheritanceResolver.new(child, :ancestors => [parent])

      assert_equal parent.domain, resolver.inherited_association(:domain, :domain_id)
      assert_nil resolver.inherited_association(:operatingsystem, :operatingsystem_id)
    end
  end
end

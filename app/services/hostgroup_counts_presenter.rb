# Controller-owned: aggregates direct and subtree host counts for a hostgroup
# collection in a fixed number of queries, for the index/CSV host-count columns.
class HostgroupCountsPresenter
  def self.load(hostgroups, scope_to_given: true)
    new(hostgroups, scope_to_given: scope_to_given).tap(&:load)
  end

  def initialize(hostgroups, scope_to_given: true)
    @hostgroups = hostgroups
    @scope_to_given = scope_to_given
    @direct_counts = {}
    @subtree_counts = {}
  end

  def load
    return self if @hostgroups.blank?

    @direct_counts = HostCounter.new(:hostgroup).hosts_count
    @subtree_counts = HostgroupSubtreeCounts.new(
      Hostgroup,
      target_hostgroups: @scope_to_given ? records : nil,
      direct_counts: @direct_counts
    ).totals
    self
  end

  def direct_host_count_for(hostgroup)
    @direct_counts[hostgroup.id].to_i
  end

  def subtree_host_count_for(hostgroup)
    @subtree_counts[hostgroup.id].to_i
  end

  private

  def records
    @records ||= Array(@hostgroups).compact
  end
end

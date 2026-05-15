require 'test_helper'

class HostDescriptionHelperTest < ActionView::TestCase
  include HostDescriptionHelper

  test '#host_action_authorizer memoizes a host-scoped authorizer' do
    host = FactoryBot.create(:host)
    user = FactoryBot.create(:user)
    authorizer = mock('authorizer')

    User.stubs(:current).returns(user)
    Authorizer.expects(:new).with(user, :collection => [host]).once.returns(authorizer)

    assert_same authorizer, host_action_authorizer(host)
    assert_same authorizer, host_action_authorizer(host)
  end
end

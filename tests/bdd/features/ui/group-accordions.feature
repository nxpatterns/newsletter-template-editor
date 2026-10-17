Feature: Collapsible groups in the Campaign and Brand tabs
  The groups start closed; which ones are open is remembered in the browser per tab, not per template.

  Scenario: Campaign groups start closed and stay open after a reload
    Given I open the editor with the German demo
    When I open the campaign tab
    Then the groups 'campaign-group-inbox, campaign-group-font, campaign-group-export-prefix' should all be closed
    When I open the group 'campaign-group-font'
    And I reload the page
    And I open the campaign tab
    Then the group 'campaign-group-font' should be open
    And the groups 'campaign-group-inbox, campaign-group-export-prefix' should all be closed

  Scenario: Brand groups start closed and remember their own state
    Given I open the editor with the German demo
    When I open the Brand tab
    Then the groups 'brand-stars, brand-name, logo-block, brand-view-in-browser' should all be closed
    When I open the group 'logo-block'
    And I reload the page
    And I open the Brand tab
    Then the group 'logo-block' should be open
    And the groups 'brand-stars, brand-name, brand-view-in-browser' should all be closed
    When I open the campaign tab
    Then the groups 'campaign-group-inbox, campaign-group-font, campaign-group-export-prefix' should all be closed

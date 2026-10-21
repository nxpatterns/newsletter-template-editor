Feature: Current blocks as a read-only tree
  The list stays the default. The tree gives an overview and says where each part is edited.

  Scenario: The list is the default and the chosen view is remembered
    Given I open the editor with the German demo
    Then the current blocks view should be 'list'
    When I switch the current blocks view to 'tree'
    And I reload the page
    Then the current blocks view should be 'tree'

  Scenario: Header parts appear in mail order and lead to the Brand tab
    Given I open the editor with the German demo
    When I switch the current blocks view to 'tree'
    Then the tree group 'head' should be collapsed
    When I expand the tree group 'head'
    Then the tree group 'head' should list 'starsTop, brandName, logo, viewInBrowserTop'
    When I point at the tree part 'logo'
    Then the tree status should name the route 'Brand › 3 Logo'
    When I open the place from the tree status
    Then the panel tab 'brand' should be the selected tab
    And the group 'logo-block' should be open

  Scenario: The footer shows its links and warns when the imprint is off
    Given I open the editor with the German demo
    When I open the panel tab 'legal'
    And I switch the frame part 'imprint' off
    And I open the panel tab 'placed'
    And I switch the current blocks view to 'tree'
    Then the tree group 'foot' should show a warning
    When I expand the tree group 'foot'
    Then the tree group 'foot' should list 'notice, social, starsBottom, company, privacy, imprint, unsubscribe, viewInBrowserBottom'
    And the tree part 'imprint' should be marked off

  Scenario: A block picked in the tree opens in the list
    Given I open the editor with the German demo
    When I switch the current blocks view to 'tree'
    And I pick block 2 in the tree
    And I open the place from the tree status
    Then the current blocks view should be 'list'
    And block 2 in the list should be selected

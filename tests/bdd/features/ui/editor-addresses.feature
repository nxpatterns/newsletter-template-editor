Feature: Editor addresses
  Every panel tab and both Current blocks views have their own address, so browser
  back and forward return to the place the user came from.

  Scenario: Back after opening a place from the tree returns to the tree
    Given I open the editor with the German demo
    When I switch the current blocks view to 'tree'
    And I expand the tree group 'head'
    And I point at the tree part 'starsTop'
    And I open the place from the tree status
    Then the panel tab 'brand' should be the selected tab
    And the address should end with '/brand'
    When I go back in the browser
    Then the panel tab 'placed' should be the selected tab
    And the current blocks view should be 'tree'
    And the address should end with '/current-blocks/tree'
    When I go forward in the browser
    Then the panel tab 'brand' should be the selected tab

  Scenario: Back walks through the tabs without asking about unsaved changes
    Given I open the editor with the German demo
    When I open the panel tab 'campaign'
    And I open the panel tab 'colors'
    Then the address should end with '/colors'
    When I go back in the browser
    Then the panel tab 'campaign' should be the selected tab
    When I go back in the browser
    Then the panel tab 'placed' should be the selected tab
    And the current blocks view should be 'list'
    And no dialog should be open

  Scenario: A reload stays on the tab in the address
    Given I open the editor with the German demo
    When I open the panel tab 'legal'
    And I reload the page
    Then the panel tab 'legal' should be the selected tab

  Scenario: The template address alone opens Current blocks in the last used view
    Given I open the editor with the German demo
    When I switch the current blocks view to 'tree'
    And I open the panel tab 'social'
    And I open the address '/edit/draft'
    Then the panel tab 'placed' should be the selected tab
    And the current blocks view should be 'tree'
    And the address should end with '/current-blocks/tree'

  Scenario: An unknown place shows the not found page with a way back to the template
    Given I open the editor with the German demo
    And I open the address '/edit/draft/nowhere'
    Then the not found page should be of kind 'page'
    When I follow the not found link 'not-found-back-to-doc'
    Then the panel tab 'placed' should be the selected tab

  Scenario: Any unknown address shows the not found page
    Given I open the address '/somewhere/else'
    Then the not found page should be of kind 'page'
    When I follow the not found link 'not-found-home'
    Then the start page should be visible

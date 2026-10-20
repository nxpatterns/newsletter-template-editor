Feature: Opening the template that holds the unsaved changes
  The not saved card and the recent list can show the same template, e.g. after typing the
  start page address mid-edit. Opening it from anywhere continues it with its changes and
  asks nothing.

  Background:
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I save the template
    And I rename the newsletter to 'Delta'

  Scenario: Typing the start page address mid-edit, then opening it from the recent list
    When I reopen the app
    Then the draft to continue should be 'Delta'
    And the recent list should contain 'Alpha'
    When I click the recent newsletter 'Alpha'
    Then the editor should continue 'Delta' without asking
    When I reopen the app
    Then the draft to continue should be 'Delta'
    And the recent list should contain 'Alpha'

  Scenario: Opening it from its pinned tile
    When I reopen the app
    And I pin the recent newsletter 'Alpha'
    And I click the pinned tile 'Alpha'
    Then the editor should continue 'Delta' without asking

  Scenario: Opening it from the library in the start page menu
    When I reopen the app
    And I pick 'Alpha' from the start page library
    Then the editor should continue 'Delta' without asking

  Scenario: Picking it in the library inside the editor
    When I pick 'Alpha' from the library
    Then the library should be closed
    And the editor should continue 'Delta' without asking

  Scenario: Another template still asks
    When I reopen the app
    And I click the start tile 'start-demo-en' and stay
    Then I should be asked about unsaved changes
    And the unsaved changes question should name only 'Delta'

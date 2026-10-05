Feature: Snackbar feedback
  As an editor user
  I want clear feedback when I save or reset
  So that I know the action worked without the page jumping

  Scenario: Save shows a bottom snackbar without scrolling the page
    Given I open the home page
    When I note the page scroll position
    And I click the Save action
    Then I should see a snackbar with text "Newsletter saved locally"
    And the snackbar should be fixed above the footer
    And the page scroll position should be unchanged

  Scenario: Version is visible in the footer
    Given I open the home page
    Then I should see the application version in the footer

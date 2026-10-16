Feature: Snackbar feedback
  As an editor user
  I want clear feedback when I save
  So that I know the action worked without the page jumping

  Scenario: Save shows a bottom snackbar without scrolling the page
    Given I open the editor with the German demo
    When I note the page scroll position
    And I save the template
    Then I should see a snackbar with text "Saved “CloudLib-EU-Example-Newsletter-Template”"
    And the snackbar should be fixed above the footer
    And the page scroll position should be unchanged

  Scenario: Version is visible in the footer
    Given I open the editor with the German demo
    Then I should see the application version in the footer

Feature: App header
  The title leads home everywhere except the start page. In the editor the second
  line shows the open newsletter and whether it is saved; Save and HTML export are
  always visible.

  Scenario: The title is plain text on the start page and a home link elsewhere
    Given I open the start page
    Then the app title should not be a link
    When I click the start tile 'start-demo-en'
    Then the app title and the home button should lead to the start page

  Scenario: The save state follows the work, and the shortcut saves without asking
    Given I open the editor with the German demo
    Then the header should show no save state
    And the Save button should be enabled
    When I save the template
    Then the save state should read 'Saved'
    And the Save button should be disabled
    When I rename the newsletter to 'Autumn offer'
    Then the save state should read 'Not saved'
    When I press the save shortcut
    Then the save state should read 'Saved'
    And no dialog should be open

  Scenario: The About page leads back to the open newsletter
    Given I open the editor with the German demo
    When I rename the newsletter to 'Autumn offer'
    And I open the About page
    Then the header should offer to go back to 'Autumn offer'
    And the app title and the home button should lead to the start page
    And the save state should read 'Not saved'
    When I go back to the newsletter
    Then the editor should show the document 'Autumn offer'

  Scenario: Going home from the About page asks about unsaved changes
    Given I open the editor with the German demo
    When I rename the newsletter to 'Autumn offer'
    And I open the About page
    And I go back to the start page
    Then I should be asked about unsaved changes

  Scenario: The footer starts with a link home that also asks about unsaved changes
    Given I open the editor with the German demo
    When I rename the newsletter to 'Autumn offer'
    And I click the home link in the footer
    Then I should be asked about unsaved changes

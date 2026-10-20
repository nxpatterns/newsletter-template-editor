Feature: Unsaved changes dialog
  Every way of replacing a template with unsaved changes asks first, names the templates
  involved and explains each answer outside the buttons. Cancel on the start page shakes
  the not saved card.

  Scenario: Starting a new template asks first, Cancel shakes the card, Discard and Save start it
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I go back to the start page
    And I answer the unsaved changes question with 'confirm-ok'
    Then the open dialog should be of kind 'info'
    When I confirm the name prompt
    And I open the recent newsletter 'Alpha'
    And I rename the newsletter to 'Beta'
    And I reopen the app
    And I click the start tile 'start-demo-en' and stay
    Then I should be asked about unsaved changes
    And the unsaved changes question should name only 'Beta'
    When I answer the unsaved changes question with 'confirm-cancel'
    Then the start page should be visible
    And the not saved card should shake
    And the draft to continue should be 'Beta'
    When I click the start tile 'start-demo-en' and stay
    And I answer the unsaved changes question with 'confirm-alt'
    Then the editor should be open
    When I reopen the app
    Then the recent list should contain 'Alpha'
    And there should be no draft to continue
    When I open the recent newsletter 'Alpha'
    And I rename the newsletter to 'Gamma'
    And I reopen the app
    And I click the start tile 'start-demo-en' and stay
    And I answer the unsaved changes question with 'confirm-ok'
    Then the editor should be open
    When I reopen the app
    Then the recent list should contain 'Gamma'

  Scenario: Reopening the same template asks first and Discard brings back the saved version
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I save the template
    And I rename the newsletter to 'Delta'
    And I reopen the app
    And I click the recent newsletter 'Alpha'
    Then I should be asked about unsaved changes
    And the unsaved changes question should name only 'Delta'
    When I answer the unsaved changes question with 'confirm-alt'
    Then the editor should show the document 'Alpha'

  Scenario: Opening from the library in the editor names both templates
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I save the template
    And I go back to the start page
    And I click the start tile 'start-demo-en'
    And I rename the newsletter to 'Beta'
    And I save the template
    And I rename the newsletter to 'Beta changed'
    And I pick 'Alpha' from the library
    Then I should be asked about unsaved changes
    And the unsaved changes question should name 'Beta changed' as unsaved and 'Alpha' as next
    When I answer the unsaved changes question with 'confirm-cancel'
    Then the editor should show the document 'Beta changed'
    When I pick 'Alpha' from the library
    And I answer the unsaved changes question with 'confirm-ok'
    Then the editor should show the document 'Alpha'
    When I reopen the app
    Then the recent list should contain 'Beta changed'

  Scenario: Opening a file asks first and names the file
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I choose the project file 'autumn.json'
    Then I should be asked about unsaved changes
    And the unsaved changes question should name 'Alpha' as unsaved and 'autumn.json' as next
    When I answer the unsaved changes question with 'confirm-cancel'
    Then the editor should show the document 'Alpha'

  Scenario: Deleting from the library is a danger dialog
    Given I open the editor with the German demo
    When I save the template
    And I ask to delete the first library entry
    Then the open dialog should be of kind 'danger'
    When I cancel the open dialog
    Then the library should still list 1 template

  Scenario: With motion allowed the card shakes and glows, and shakes again on the next Cancel
    Given motion is allowed
    And I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I save the template
    And I rename the newsletter to 'Alpha edited'
    And I reopen the app
    And I watch the not saved card
    And I click the start tile 'start-demo-en' and stay
    And I answer the unsaved changes question with 'confirm-cancel'
    Then the not saved card should shake and glow
    When the not saved card has stopped
    And I watch the not saved card
    And I click the start tile 'start-demo-en' and stay
    And I answer the unsaved changes question with 'confirm-cancel'
    Then the not saved card should shake and glow

  Scenario: With reduced motion the card only glows
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I reopen the app
    And I watch the not saved card
    And I click the start tile 'start-demo-en' and stay
    And I answer the unsaved changes question with 'confirm-cancel'
    Then the not saved card should only glow

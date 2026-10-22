Feature: Reset dialog
  "Reset everything to defaults" lists each kind of stored data with its count, all checked.
  The user unchecks what stays, may save the checked kinds as a file first, and confirms.
  Kinds without data are hidden; the app language always stays (decisions 63 to 67).

  Scenario: Every kind with data is listed and checked; the delete button follows the selection
    Given I open the editor with the German demo
    When I save the template
    And the browser remembers a panel width
    And I go back to the start page
    And I open the reset dialog
    Then the reset dialog should list 'templates,workingDraft,viewSettings'
    And the reset kind 'templates' should show the count '1'
    And every reset kind should be checked
    And the selected line should read 'Selected: everything'
    And the delete button should read 'Delete everything'
    When I uncheck the reset kind 'viewSettings'
    Then the delete button should read 'Delete selected'
    And the selected line should read 'Selected: Templates, Current working draft'
    When I choose none of the reset kinds
    Then the reset hint 'reset.hint.none' should be shown
    And saving and deleting should not be possible even after ticking the acknowledgement
    When I choose all reset kinds
    Then the delete button should read 'Delete everything'

  Scenario: Own blocks and block drafts are listed with counts; kept drafts stay as standalone drafts
    Given I open the start page
    And the browser holds 3 own blocks and 5 block drafts
    When I open the reset dialog
    Then the reset dialog should list 'ownBlocks,blockDrafts'
    And the reset kind 'ownBlocks' should show the count '3'
    And the reset kind 'blockDrafts' should show the count '5'
    When I uncheck the reset kind 'blockDrafts'
    Then the reset hint 'reset.hint.draftsStandalone' should be shown
    When I confirm the reset
    Then the start page should be visible
    And the start page message should say 'Partly reset. Deleted: 3 own blocks.'
    And the browser should hold 0 own blocks and 5 standalone block drafts

  Scenario: Unchecked templates stay after the reset
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the reset dialog
    And I uncheck the reset kind 'templates'
    And I confirm the reset
    Then the start page should be visible
    And the start page message should say 'Partly reset.'
    And the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'
    And there should be no draft to continue
    When I close the start page message
    Then no start page message should be shown

  Scenario: The checked kinds are saved as a file and open again after the reset
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the reset dialog
    And I uncheck the reset kind 'workingDraft'
    And I uncheck the reset kind 'viewSettings'
    And I save the checked kinds as a file
    Then the saved backup should hold only 'templates'
    And the save box should name the backup file
    When I check the reset kind 'workingDraft'
    Then the save box should say the selection changed
    When I confirm the reset
    Then the start page message should offer to open the backup
    And the recent list should be empty
    When I open the backup from the start page message
    Then the start page message should say 'Backup opened. Restored: 1 template.'
    And the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: Escape closes the reset dialog without deleting
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the reset dialog
    And I press Escape
    Then the reset dialog should be closed
    And the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: On a phone the reset dialog is a sheet from the bottom with the delete button on top
    Given the window is phone sized
    And I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the reset dialog
    Then the reset dialog should sit at the bottom of the screen
    And the delete button should be above the cancel button

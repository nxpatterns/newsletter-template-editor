Feature: Header menus and reset to defaults
  The start page has a "⋮" menu with the start choices and the saved templates.
  Both menus end with a red "reset everything to defaults" entry that asks before it deletes.

  Scenario: The start page menu offers the start choices, saved templates and the reset last
    Given I open the start page
    When I open the start page menu
    Then the start page menu entries should be 'start-menu-blank,start-menu-demo-de,start-menu-demo-en,start-menu-open-saved,menu-factory-reset'
    And the menu entry 'start-menu-open-saved' should be disabled
    And the reset entry should be shown in the danger color

  Scenario: A demo opens from the start page menu
    Given I open the start page
    When I open the start page menu
    And I choose the menu entry 'start-menu-demo-en'
    Then the editor should show the document 'CloudLib-EU-Example-Newsletter-Template-EN'

  Scenario: Saved templates open from the start page menu
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the start page menu
    Then the menu entry 'start-menu-open-saved' should be enabled
    When I choose the menu entry 'start-menu-open-saved'
    And I pick the saved template 'CloudLib-EU-Example-Newsletter-Template'
    Then the editor should show the document 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: The editor menu ends with the reset entry
    Given I open the editor with the German demo
    When I open the editor menu
    Then the last editor menu entry should be 'menu-factory-reset'
    And the reset entry should be shown in the danger color

  Scenario: Cancelling the reset keeps everything
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I open the start page menu
    And I choose the menu entry 'menu-factory-reset'
    Then the reset warning can only be confirmed after ticking the acknowledgement
    When I cancel the dialog
    Then the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'
    When I reopen the app
    Then the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: Confirming the reset deletes templates, draft and view state but keeps the language
    Given I open the editor with the German demo
    When I save the template
    And I switch the app language to 'de'
    And I rename the newsletter to 'Unsaved draft'
    And the browser remembers a panel width
    And I open the editor menu
    And I choose the menu entry 'menu-factory-reset'
    And I confirm the reset
    Then the start page should be visible
    And the recent list should be empty
    And there should be no draft to continue
    And the browser should keep no app state except the language
    And the app language should be 'de'

  Scenario: A long template name wraps in the editor menu head instead of being cut
    Given I open the editor with the German demo
    When I rename the newsletter to a name with 255 characters
    And I open the editor menu
    Then the template name in the menu head should be shown in full on several lines

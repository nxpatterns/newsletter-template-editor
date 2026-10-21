Feature: Language menu
  The header has one language button. Its menu lists the languages that have a translation
  and, greyed out, the languages that are planned but not translated yet.

  Scenario: Only translated languages can be chosen
    Given I open the start page
    When I open the language menu
    Then the choosable languages should be 'de,en'
    And the planned languages should be 'es,fr,it,tr'
    And the planned languages should not be buttons
    And the language menu should have no search field

  Scenario: Choosing a language switches the app and closes the menu
    Given I open the start page
    When I open the language menu
    And I choose the language 'de'
    Then the app language should be 'de'
    And the language menu should be closed
    When I open the language menu
    Then the language 'de' should be marked as current

  Scenario: Clicking a planned language changes nothing
    Given I open the start page
    When I open the language menu
    And I click the planned language 'fr'
    Then the app language should be 'en'
    And the language menu should be open

  Scenario: The menu works with the keyboard
    Given I open the start page
    When I open the language menu with the keyboard
    Then the focus should be on the language 'en'
    When I press 'ArrowDown' in the language menu
    Then the focus should be on the language 'de'
    When I press 'ArrowDown' in the language menu
    Then the focus should be on the language 'en'
    When I press 'Escape' in the language menu
    Then the language menu should be closed
    And the focus should be on the language button

  Scenario: Clicking outside closes the menu
    Given I open the start page
    When I open the language menu
    And I click outside the language menu
    Then the language menu should be closed

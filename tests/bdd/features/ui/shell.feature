Feature: App shell layout
  As an editor user
  I want a fixed chrome shell without a page scrollbar
  So that only the email preview scrolls

  Scenario: Document does not scroll
    Given I open the editor with the German demo
    Then the document should not scroll

  Scenario: Preview fills the work area between header and footer
    Given I open the editor with the German demo
    Then the preview frame should fill the main work area

  Scenario: Locale switcher is in the header
    Given I open the editor with the German demo
    Then I should see the locale switcher

  Scenario: Impressum opens a dialog
    Given I open the editor with the German demo
    When I open the impressum footer link
    Then I should see the legal dialog
    And the legal dialog should have a single scroll container

  Scenario: About page is reachable
    Given I open the editor with the German demo
    When I open the about footer link
    Then I should see the about page

  Scenario: Side panel collapses with the toggle control
    Given I open the editor with the German demo
    When I toggle the side panel
    Then the side panel should be collapsed
    And the side panel rail should remain visible
    When I toggle the side panel
    Then the side panel should be expanded

Feature: Editor side panel
  As an editor user
  I want clear placed vs catalog tabs and a resizable side panel
  So I can edit sections without confusion

  Scenario: Placed and catalog tabs are separate
    Given I open the home page
    Then I should see the editor panel tabs
    And I should see the placed blocks list
    When I open the catalog tab
    Then I should see the block catalog cards

  Scenario: Catalog cards do not insert on click
    Given I open the home page
    When I open the catalog tab
    And I note the placed block count
    And I click a divider catalog card
    Then the catalog tab should stay selected
    And the placed block count should be unchanged

  Scenario: Catalog cards are draggable palette items
    Given I open the home page
    When I open the catalog tab
    Then the divider catalog card should be draggable

  Scenario: Editing a hero label updates the preview
    Given I open the home page
    When I select the first document block
    And I set the hero label to "Acme Labs"
    Then the preview frame should contain "Acme Labs"

  Scenario: Campaign tab explains the inbox preview line
    Given I open the home page
    When I open the campaign tab
    Then I should see the preheader help text

  Scenario: Side panel width can grow up to half the viewport
    Given I open the home page
    When I resize the side panel toward half the viewport
    Then the side panel width should be within the allowed range

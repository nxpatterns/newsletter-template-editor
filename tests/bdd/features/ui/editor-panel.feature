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

  Scenario: CTA link list uses a structured row editor
    Given I open the home page
    When I open the link list block editor
    Then the block edit modal should be fully visible in the viewport
    And I should see the CTA link row editor without a JSON textarea
    When I add a CTA link row titled "Follow-up call"
    And I save the block edit modal
    Then the preview frame should contain "Follow-up call"

  Scenario: Tall CTA editor keeps the dialog head reachable
    Given I open the home page
    When I open the link list block editor
    And I add several empty CTA link rows totaling at least 6
    Then the block edit modal should be fully visible in the viewport
    And the block edit modal head should stay within the viewport
    And the block edit modal should stack above the app header

  Scenario: Preview stays on the link list after save
    Given I open the home page
    When I select the link list block
    Then the preview should show the selected block in view
    When I open the link list block editor
    And I rename the first CTA link row title to "Stay put title"
    And I save the block edit modal
    Then the preview frame should contain "Stay put title"
    And the preview should show the selected block in view

  Scenario: Live edit reload keeps the preview where smooth scroll settled
    Given I open the home page
    When smooth scrolling is enabled
    And I select the link list block and the preview scroll settles
    And I open the link list block editor
    And I rename the first CTA link row title to "Settled title"
    Then the preview frame should contain "Settled title"
    And the preview should keep the settled scroll position

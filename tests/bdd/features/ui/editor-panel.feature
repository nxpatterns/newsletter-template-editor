Feature: Editor side panel
  As an editor user
  I want tabs and a resizable side panel
  So I can edit blocks and globals without leaving the preview

  Scenario: Block library tab is available
    Given I open the home page
    Then I should see the editor panel tabs
    And I should see the block library

  Scenario: Editing a hero label updates the preview
    Given I open the home page
    When I select the first document block
    And I set the hero label to "Acme Labs"
    Then the preview frame should contain "Acme Labs"

  Scenario: Side panel width can grow up to half the viewport
    Given I open the home page
    When I resize the side panel toward half the viewport
    Then the side panel width should be within the allowed range

Feature: First block in an empty newsletter
  An empty newsletter has one place for the first block: right below the email header.

  Scenario Outline: Dropping the first block, in the content or in the margin
    Given I open the start page
    And I click the start tile 'start-blank'
    Then the preview should show the empty slot 'Drag your first block here'
    When I drag the catalog card 'chapter-band' over the preview <where>
    Then the empty slot should be marked as the insert target
    And the preview should not show 'insert at end'
    When I drop it
    Then the first block in the preview should be a 'chapter-band'
    And the preview should not show the empty slot

    Examples:
      | where          |
      | content        |
      | left margin    |

  Scenario: The empty slot is never exported
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the HTML export
    Then the export should not contain 'Drag your first block here'

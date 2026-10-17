Feature: Selection in the preview
  As an editor user
  I want to clear the block selection by clicking beside the template
  So I can see the template without markers or frames

  Scenario: A click on the empty area deselects, a click on a block selects again
    Given I open the editor with a placeholder button 'test-placeholder'
    When I click preview block 'test-placeholder'
    Then the preview block 'test-placeholder' should be selected
    When I click the empty area of the preview
    Then no preview block should be selected
    When I click preview block 'test-placeholder'
    Then the preview block 'test-placeholder' should be selected

  Scenario: A click in the side panel keeps the selection
    Given I open the editor with a placeholder button 'test-placeholder'
    When I click preview block 'test-placeholder'
    And I open the catalog tab
    Then the preview block 'test-placeholder' should be selected

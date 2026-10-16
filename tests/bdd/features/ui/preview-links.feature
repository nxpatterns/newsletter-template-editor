Feature: Links in the preview
  As an editor user
  I want to follow a link from the block I am working on
  So I can check its target without leaving the editor

  Scenario: A link only opens once its block is selected, placeholder links stay inert
    Given I open the editor with a placeholder button 'test-placeholder'
    And I count new tabs
    When I click the link in preview block 'test-placeholder'
    Then the preview block 'test-placeholder' should be selected
    When I click the link in preview block 'test-placeholder'
    And I click the link in preview block 'bmo8rynqo-e'
    Then the preview block 'bmo8rynqo-e' should be selected
    When I click the link in preview block 'bmo8rynqo-e'
    Then a new tab should open 'https://www.cloudlib.eu/'
    And exactly 1 new tab should have opened

Feature: Block editor, clone mode
  "Adjust" on a built-in card opens an own copy in the block editor at /blocks/<id>?from=<template>.
  The structure stays the one of the original; starting texts, the layout options of the type and
  the colors (as roles or fixed) change. Saved copies appear under "All blocks › Own" and can be
  placed like built-in blocks (decisions 31, 32, 40, 49 to 51, 68).

  Scenario: "Adjust" opens a new copy with the structure locked
    Given I open the editor with the German demo
    When I adjust the built-in block 'price-box'
    Then the block editor should show a copy of 'Price box'
    And the block editor address should name the template it came from
    And the block state should read 'New, not saved yet'
    And the block preview should show the badge 'Structure locked'
    And the block preview should say it uses the colors of the template
    When I open the block tab 'parts'
    Then the parts should be locked

  Scenario: Starting texts and colors change, the copy is saved and opens again after a reload
    Given I open the editor with the German demo
    And I adjust the built-in block 'price-box'
    When I change the block field 'Amount' to '149'
    Then the block preview should show '149'
    And the block state should read 'Not saved'
    When I fix the block color 'price' to '#fb923c'
    Then the block color 'price' should be marked as fixed
    And the block color 'price' should warn about 'Light'
    And the check tab should count 1 finding
    When I save the block as own block
    Then the block state should read 'Saved · version 1'
    And the replace offer should name 1 block
    When I close the replace offer
    And I reload the block editor
    Then the block state should read 'Saved · version 1'
    And the block preview should show '149'
    And the block color 'price' should be marked as fixed

  Scenario: Undo in the block editor never touches the template
    Given I open the editor with the German demo
    And I adjust the built-in block 'price-box'
    When I change the block field 'Amount' to '149'
    And I undo in the block editor
    Then the block preview should show '99'
    And the block state should read 'New, not saved yet'

  Scenario: Replacing the placed blocks of the type keeps their texts
    Given I open the editor with the German demo
    And I adjust the built-in block 'price-box'
    When I fix the block color 'price' to '#fb923c'
    And I save the block as own block
    And I accept the replace offer
    And I go back from the block editor
    Then the template should have unsaved changes
    And the placed block list should mark 1 block as own
    And the preview price box should keep the amount '99'

  Scenario: A saved copy is listed under Own and can be placed
    Given I open the editor with the German demo
    And I adjust the built-in block 'hero'
    And I save the block as own block
    And I go back from the block editor
    When I show the own blocks
    Then the own block list should show 'Hero (copy)' with 'version 1'
    When I drag the own block 'Hero (copy)' to the top of the preview
    Then the first block in the preview should be an own 'hero'
    And the placed block list should mark 1 block as own

  Scenario: Leaving with unsaved changes asks first
    Given I open the editor with the German demo
    And I adjust the built-in block 'price-box'
    When I change the block field 'Amount' to '149'
    And I click the way back in the block editor
    Then the leave question should offer to save a draft
    When I discard the block changes
    Then the editor should show the panel tab 'catalog'

  Scenario: The address of a block that does not exist shows the block not found page
    Given I open the address '/blocks/0192f3a4-0000-7000-8000-000000000000'
    Then the not found page should be of kind 'block'

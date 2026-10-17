Feature: Editor side panel
  As an editor user
  I want clear placed vs catalog tabs and a resizable side panel
  So I can edit sections without confusion

  Scenario: Placed and catalog tabs are separate
    Given I open the editor with the German demo
    Then I should see the editor panel tabs
    And I should see the placed blocks list
    When I open the catalog tab
    Then I should see the block catalog cards

  Scenario: Catalog cards do not insert on click
    Given I open the editor with the German demo
    When I open the catalog tab
    And I note the placed block count
    And I click a divider catalog card
    Then the catalog tab should stay selected
    And the placed block count should be unchanged

  Scenario: Catalog cards are draggable palette items
    Given I open the editor with the German demo
    When I open the catalog tab
    Then the divider catalog card should be draggable

  Scenario: Editing a hero label updates the preview
    Given I open the editor with the German demo
    When I select the first document block
    And I set the hero label to "Acme Labs"
    Then the preview frame should contain "Acme Labs"

  Scenario: Campaign tab explains the inbox preview line
    Given I open the editor with the German demo
    When I open the campaign tab
    Then I should see the preheader help text

  Scenario: Side panel width can grow up to half the viewport
    Given I open the editor with the German demo
    When I resize the side panel toward half the viewport
    Then the side panel width should be within the allowed range

  Scenario: CTA link list uses a structured row editor
    Given I open the editor with the German demo
    When I open the link list block editor
    Then the block edit modal should be fully visible in the viewport
    And I should see the CTA link row editor without a JSON textarea
    When I add a CTA link row titled "Follow-up call"
    And I save the block edit modal
    Then the preview frame should contain "Follow-up call"

  Scenario: Tall CTA editor keeps the dialog head reachable
    Given I open the editor with the German demo
    When I open the link list block editor
    And I add several empty CTA link rows totaling at least 6
    Then the block edit modal should be fully visible in the viewport
    And the block edit modal head should stay within the viewport
    And the block edit modal should stack above the app header

  Scenario: Preview stays on the link list after save
    Given I open the editor with the German demo
    When I select the link list block
    Then the preview should show the selected block in view
    When I open the link list block editor
    And I rename the first CTA link row title to "Stay put title"
    And I save the block edit modal
    Then the preview frame should contain "Stay put title"
    And the preview should show the selected block in view

  Scenario: Live edit reload keeps the preview where smooth scroll settled
    Given I open the editor with the German demo
    When smooth scrolling is enabled
    And I select the link list block and the preview scroll settles
    And I open the link list block editor
    And I rename the first CTA link row title to "Settled title"
    Then the preview frame should contain "Settled title"
    And the preview should keep the settled scroll position

  Scenario: Formatting info explains and removes paragraph formatting
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    And I turn on the formatting info
    Then a paragraph info label should mention 'Contains: .*Headings'
    When I click the first inline-colored text
    Then the info panel should list 'Color: Headings'
    When I remove the color in the info panel
    Then that text should have no inline color anymore

  Scenario: Coloring a word in a later paragraph colors exactly that word
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    And I select 'cloudlib.eu' in paragraph 2 of the editor
    And I set the text color to 'accent'
    Then paragraph 2 should color exactly 'cloudlib.eu' as 'accent'
    And the color control should show 'accent'
    When I select 'Sichtbarkeit' in paragraph 3 of the editor
    And I set the text color to 'link'
    Then paragraph 3 should color exactly 'Sichtbarkeit' as 'link'
    And the color control should show 'link'
    And the size control should show 'xl'

  Scenario: Formatting info lists and removes bold text
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    And I turn on the formatting info
    Then the info label of paragraph 2 should mention 'Contains: Bold'
    When I click the bold text in paragraph 2
    Then the info panel should show 'Bold'
    When I remove 'bold' in the info panel
    Then paragraph 2 should have no bold text anymore
    And undo should be available
    When I undo in the paragraph editor
    Then paragraph 2 should have bold text again

  Scenario: Formatting info is read-only and explains links
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    And I select 'cloudlib.eu' in paragraph 2 of the editor
    And I link the selection to 'cloudlib.eu'
    And I turn on the formatting info
    Then the paragraph text should be read-only
    And every editing control should be disabled
    And the info label of paragraph 2 should mention 'Link'
    When I click the link in paragraph 2
    Then the link editor should stay closed
    And the info panel should show 'Link: https://cloudlib.eu'
    When I remove 'link' in the info panel
    Then paragraph 2 should have no link anymore

  Scenario: The text check finds hidden characters and removes them
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    Then the text check should report 'Clean'
    When I type a hidden zero-width character into paragraph 2
    Then the text check should report 'Zero-width: 1'
    When I remove all hidden characters
    Then the text check should report 'Clean'

  Scenario: A link goes where the cursor is, and its type follows the address
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    Then the link button should be disabled
    When I place the cursor after 'Ländern ' in paragraph 2
    And I open the link form
    And I fill the link text with 'unsere Plattform'
    And I type the link address 'info@cloudlib.eu'
    Then the link type should be 'email'
    And the link hint should say 'Opens an email to info@cloudlib.eu'
    When I confirm the link
    Then paragraph 2 should read 'Ländern unsere Plattform' with a link 'unsere Plattform' to 'mailto:info@cloudlib.eu'
    When I click the link 'unsere Plattform'
    Then the link popover should show 'info@cloudlib.eu'
    When I edit the link
    And I type the link address '+49 30 1234567'
    Then the link type should be 'phone'
    When I confirm the link
    Then paragraph 2 should read 'Ländern unsere Plattform' with a link 'unsere Plattform' to 'tel:+49301234567'
    When I click the link 'unsere Plattform'
    And I remove the link in the popover
    Then paragraph 2 should have no link anymore

  Scenario: Escape closes the link form without changes
    Given I open the editor with the German demo
    When I open the paragraph editor for seed block 'bmo8rynqo-6'
    And I select 'cloudlib.eu' in paragraph 2 of the editor
    And I open the link form
    Then the link type should be 'web'
    And the link hint should say 'Opens https://cloudlib.eu'
    When I press Escape in the link form
    Then the link form should be closed
    And paragraph 2 should have no link anymore


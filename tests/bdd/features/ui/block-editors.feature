Feature: Block editors
  Sellers edit lists and prices without wading through repeated fields.

  Scenario: Link list rows open one at a time and email addresses become mailto links
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-f'
    Then link list row 1 should be open
    When I open link list row 2
    Then link list row 2 should be open
    And link list row 1 should be closed
    When I enter the link address 'info@cloudlib.eu' in link list row 2
    Then link list row 2 should link to 'mailto:info@cloudlib.eu' and show 'Email'

  Scenario: Benefits share one icon, Enter adds a line and arrow keys reorder
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-a'
    And I pick '★' as the icon for all benefit lines
    Then every benefit line should use the icon '★'
    When I press Enter in benefit line 1
    Then there should be 5 benefit lines with line 2 empty and focused
    When I move benefit line 1 down with the keyboard
    Then benefit line 2 should read 'Dedizierter Unternehmenseintrag auf cloudlib.eu'

  Scenario: Turning off the previous price hides its fields and the struck line
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-b'
    And I turn off the previous price
    Then the previous price fields should be hidden
    And the preview frame should not show a previous price

  Scenario: Short editors open as tall as their content
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-2'
    Then the block editor should be shorter than the default height

  Scenario: Text fields count characters and show when a text gets long
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-e'
    Then the button text counter should read '17 / 30'
    When I type the button text 'Jetzt kostenlos und unverbindlich testen'
    Then the button text counter should warn

  Scenario: A button link typed as a phone number becomes a tel link
    Given I open the editor with the German demo
    When I open the block editor for seed block 'bmo8rynqo-e'
    And I enter the button link '+49 30 1234567'
    Then the button should link to 'tel:+49301234567' and show 'Phone'

  Scenario: Divider style is picked from picture tiles and the space height only applies to space
    Given I open the editor with an extra thin divider
    When I open the block editor for seed block 'test-divider'
    Then the divider tile 'thin' should be selected
    And the space height slider should be disabled
    When I pick the divider tile 'spacer-only'
    Then the divider tile 'spacer-only' should be selected
    And the space height slider should be enabled

  Scenario: Divider background stores a color token and is greyed out where it cannot show
    Given I open the editor with an extra thin divider
    When I open the block editor for seed block 'test-divider'
    Then the divider background switch should be disabled
    When I pick the divider tile 'spacer-only'
    And I pick the divider background 'page'
    Then the preview divider 'test-divider' should use the page background color

  Scenario: A thin divider can be picked in the preview just above its line
    Given I open the editor with an extra thin divider
    When I click 8px above the divider 'test-divider' in the preview
    Then the preview block 'test-divider' should be selected

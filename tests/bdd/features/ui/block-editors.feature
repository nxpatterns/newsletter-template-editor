Feature: Block editors
  Sellers edit lists and prices without wading through repeated fields.

  Scenario: Link list rows open one at a time and email addresses become mailto links
    Given I open the home page
    When I open the block editor for seed block 'bmo8rynqo-f'
    Then link list row 1 should be open
    When I open link list row 2
    Then link list row 2 should be open
    And link list row 1 should be closed
    When I enter the link address 'info@cloudlib.eu' in link list row 2
    Then link list row 2 should link to 'mailto:info@cloudlib.eu' and show 'Email'

  Scenario: Benefits share one icon, Enter adds a line and arrow keys reorder
    Given I open the home page
    When I open the block editor for seed block 'bmo8rynqo-a'
    And I pick '★' as the icon for all benefit lines
    Then every benefit line should use the icon '★'
    When I press Enter in benefit line 1
    Then there should be 5 benefit lines with line 2 empty and focused
    When I move benefit line 1 down with the keyboard
    Then benefit line 2 should read 'Dedizierter Unternehmenseintrag auf cloudlib.eu'

  Scenario: Turning off the previous price hides its fields and the struck line
    Given I open the home page
    When I open the block editor for seed block 'bmo8rynqo-b'
    And I turn off the previous price
    Then the previous price fields should be hidden
    And the preview frame should not show a previous price

Feature: Greeting block
  An opening line. By default the same neutral line for everyone; optionally with the recipient name,
  and the neutral line for recipients whose name is not known.

  Scenario: Switching on the name, with the neutral line as fallback
    Given I open the home page with an extra greeting block
    Then the greeting preview should read 'Werte Geschäftspartner'
    When I open the block editor for seed block 'test-greeting'
    And I switch on the greeting by name
    Then the greeting preview should read 'Guten Tag Maria Muster'
    When I set the greeting sample name to ''
    Then the greeting preview should read 'Werte Geschäftspartner'

  Scenario: Size and color of the greeting
    Given I open the home page with an extra greeting block
    When I open the block editor for seed block 'test-greeting'
    And I choose the greeting option 'size' 'l'
    And I choose the greeting option 'color' 'primary'
    Then the greeting preview should use size 'l' and color 'primary'

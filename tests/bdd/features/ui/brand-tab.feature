Feature: Brand tab
  Sellers build the brand name from colored parts and set the stars row without typing HTML.

  Scenario: The brand name parts and the stars change the email header
    Given I open the editor with the German demo
    When I open the Brand tab
    And I open the group 'brand-name'
    And I rename brand name part 2 to 'Library'
    Then the preview brand name should read 'CloudLibrary.EU'
    When I add a brand name part 'Pro'
    Then the preview brand name should read 'CloudLibrary.EUPro'
    When I open the group 'brand-stars'
    And I lower the stars to 0
    Then the preview should show no stars

Feature: Star colors in the Brand tab
  The top and bottom stars each have a color of their own, set next to the stars in the Brand tab and no longer tied to the accent.

  Scenario: Top and bottom star colors are independent of each other and of the accent
    Given I open the editor with the German demo
    When I open the colors tab
    And I change the general color 'accent' to '#abcdef'
    Then the colors tab should offer no star color
    When I open the Brand tab
    Then the 'top' stars should use the standard 'dark' star color
    And the 'bottom' stars should use the standard 'dark' star color
    When I set the 'top' star color to '#ff3366'
    Then the 'top' stars should have the color '#ff3366'
    And the 'bottom' stars should use the standard 'dark' star color
    When I open the colors tab
    And I switch to the 'light' color set
    And I open the Brand tab
    Then the 'top' stars should use the standard 'light' star color

  Scenario: An unreadable star color is reported for its own frame and can be fixed or reset
    Given I open the editor with the German demo
    When I open the Brand tab
    And I set the 'bottom' star color to '#0c1628'
    Then the 'bottom' star color should warn about its background
    And the 'top' star color should show no warning
    When I make the 'bottom' star color readable
    Then the 'bottom' star color should show no warning
    When I reset the 'bottom' star color
    Then the 'bottom' stars should use the standard 'dark' star color

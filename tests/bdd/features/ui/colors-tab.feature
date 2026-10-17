Feature: Colors tab
  As a seller
  I want separate light and dark color sets with general and block colors
  So I can adapt a newsletter without breaking it

  Scenario: Light and dark are separate sets with their own preview
    Given I open the editor with the German demo
    When I open the colors tab
    And I switch to the 'light' color set
    Then the preview page should use the standard 'light' page color
    When I switch to the 'dark' color set
    Then the preview page should use the standard 'dark' page color

  Scenario: Changing a general color asks about blocks that were adjusted individually
    Given I open the editor with the German demo
    When I open the colors tab
    And I give the block 'stat-box' its own 'number' color '#445566'
    And I change the general color 'link' to '#778899'
    Then the color question should be shown with 'keep' preselected
    When I confirm the color question
    Then the general color 'link' should be '#778899'
    And the block 'stat-box' should still use its own 'number' color '#445566'

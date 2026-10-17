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

  Scenario: Block colors belong to one color set and can be reset per block
    Given I open the editor with the German demo
    When I open the colors tab
    And I give the block 'stat-box' its own 'number' color '#445566'
    And I switch to the 'light' color set
    Then the block 'stat-box' should not use its own 'number' color '#445566'
    When I switch to the 'dark' color set
    Then the block 'stat-box' should still use its own 'number' color '#445566'
    When I reset the colors of the block 'stat-box'
    Then the block 'stat-box' should not use its own 'number' color '#445566'

  Scenario: Every placed block has its own entry in the block colors
    Given I open the editor with the German demo
    When I open the colors tab
    Then the block colors should list every placed block once

  Scenario: Header and footer are own sections that start closed and stay open after a reload
    Given I open the editor with the German demo
    When I open the colors tab
    Then the color sections should be 'general, header, footer, blocks' in this order
    And the color sections 'header, footer' should each be listed once
    And the color sections 'header, footer' should be closed
    When I open the color section 'footer'
    And I reload the page
    And I open the colors tab
    Then the color section 'footer' should be open
    And the color sections 'header' should be closed

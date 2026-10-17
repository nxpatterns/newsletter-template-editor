Feature: Block editor shows the block's own colors
  As a seller
  I want the block editor to show the colors the preview shows for that block
  So I can edit text on the background and in the color it will really have

  Scenario Outline: The <type> editor uses the colors set in the block, in the active color set
    Given I open the editor with the German demo
    When I open the colors tab
    And I switch to the 'light' color set
    And I give the block '<type>' its own '<bg>' color '#0c1d33' and '<fg>' color '#ffffff'
    And I open the block editor for the first '<type>' block
    Then the editor field '<field>' should show text '#ffffff' on '#0c1d33'
    And the preview of the first '<type>' block should show '<fgSel>' in '#ffffff' on '<bgSel>' in '#0c1d33'

    Examples:
      | type         | bg         | fg         | field                | fgSel           | bgSel             |
      | chapter-band | background | title      | insp-chapter-title   | .chapter-title  | .chapter-bg       |
      | hero         | background | headline   | insp-hero-headline   | .hero-headline  | .content-bg       |
      | pull-quote   | background | text       | insp-quote           | .pull-quote     | .content-bg       |
      | stat-box     | box        | number     | insp-stat-number     | .stat-number    | .stat-box-inner   |
      | cta-button   | button     | buttonText | insp-cta-text        | a.cta-button-link | .cta-button-cell |
      | paragraph    | background | text       | paragraph-surface    | .paragraph-body | .content-bg       |

  Scenario: Without own colors the chapter editor follows the light set, not the dark accent
    Given I open the editor with the German demo
    When I open the colors tab
    And I switch to the 'light' color set
    And I open the block editor for the first 'chapter-band' block
    Then the editor field 'insp-chapter-title' should show the standard 'light' colors 'accent' on 'surface'

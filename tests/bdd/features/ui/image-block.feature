Feature: Image block and logo picker
  Sellers add pictures by link (works everywhere) or by file (embedded, with a warning).

  Background:
    Given hosted test images are served

  Scenario: A linked image needs a description and shows in the preview
    Given I open the editor with an extra empty image block
    When I open the block editor for seed block 'test-image'
    Then the image description should be marked as required
    When I paste the image link 'https://cdn.example.test/hotel.png'
    Then the image status should read 'Online image · 40 × 30'
    And no embedded image warning should be shown
    And the preview should show the image 'https://cdn.example.test/hotel.png'
    When I describe the image as 'Hotel room in 3D'
    Then the image description should not be marked as required

  Scenario: A dropped file is embedded at email width and warned about
    Given I open the editor with an extra empty image block
    When I open the block editor for seed block 'test-image'
    And I choose a 1200 × 600 picture file
    Then the image status should start with 'Embedded'
    And the image status should mention '600 × 300'
    And the embedded image warning and the email size meter should be shown

  Scenario: The logo can be switched from an embedded SVG to a hosted link
    Given I open the editor with the German demo
    When I open the Brand tab
    Then the logo should be flagged as SVG and embedded
    When I paste the logo link 'https://cdn.example.test/logo.png'
    Then the image status should read 'Online image · 40 × 30'
    And the logo should not be flagged

Feature: Image and text block
  A picture beside a paragraph; the seller picks the side, the image width and the text position.

  Background:
    Given hosted test images are served

  Scenario: The picture moves to the chosen side of the text
    Given I open the editor with an extra image and text block
    When I open the block editor for seed block 'test-image-text'
    And I paste the image link 'https://cdn.example.test/room.png'
    Then the image status should read 'Online image · 40 × 30'
    And the preview should show the picture left of the text
    When I choose the image text option 'side' 'right'
    Then the preview should show the picture right of the text
    When I choose the image text option 'width' 'half'
    Then the preview picture should be 242 pixels wide

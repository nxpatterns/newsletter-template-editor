Feature: Contact person, customer quote and video preview
  Three blocks for sellers: who to call, what a customer says, and a link to a video or 3D tour.

  Background:
    Given hosted test images are served

  Scenario: A contact person with phone, email and photo
    Given I open the start page
    And I click the start tile 'start-blank'
    When I drag the catalog card 'contact' over the preview content
    And I drop it
    And I open the block editor for the first block
    And I fill 'insp-contact-name' with 'Kim Weber'
    And I fill 'insp-contact-phone' with '+49 30 555 01'
    Then the preview should show 'Kim Weber' in '.contact-name'
    And the preview should link 'tel:+493055501'
    And the preview should link 'mailto:alex.berger@example.com'
    And the preview should have no '.contact-photo'
    When I paste the image link 'https://cdn.example.test/kim.png'
    Then the 'contact' image description should be marked as required
    When I fill 'insp-contact-description' with 'Kim Weber'
    Then the 'contact' image description should not be marked as required
    And the preview should have a '.contact-photo'

  Scenario: A customer quote with company logo
    Given I open the start page
    And I click the start tile 'start-blank'
    When I drag the catalog card 'pull-quote' over the preview content
    And I drop it
    And I open the block editor for the first block
    And I fill 'insp-quote-role' with 'Owner, Example Ltd'
    Then the preview should show 'Owner, Example Ltd' in '.quote-role'
    And the preview should have a '.pull-quote-centered'
    When I click 'quote-image-logo'
    And I paste the image link 'https://cdn.example.test/logo.png'
    And I fill 'insp-quote-description' with 'Example Ltd'
    Then the preview should have a '.quote-logo'

  Scenario: A video preview links image and title to the tidied link target
    Given I open the start page
    And I click the start tile 'start-blank'
    When I drag the catalog card 'video' over the preview content
    And I drop it
    And I open the block editor for the first block
    Then the 'video' image description should be marked as required
    When I fill 'insp-video-link-target' with 'vimeo.com/123' and leave the field
    Then the field 'insp-video-link-target' should read 'https://vimeo.com/123'
    When I fill 'insp-video-title' with 'Our new showroom'
    Then the preview should show 'Our new showroom' in '.video-title-link'
    And the preview should show '· 2:30' in '.video-duration'
    And the preview should link 'https://vimeo.com/123' 2 times

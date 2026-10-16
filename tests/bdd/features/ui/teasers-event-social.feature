Feature: Teasers, event and social media footer
  Offers side by side, an event with "Add to calendar", and social network icons in the footer.

  Scenario: Teasers in three columns with a teaser added
    Given I open the start page
    And I click the start tile 'start-blank'
    When I drag the catalog card 'teasers' over the preview content
    And I drop it
    And I open the block editor for the first block
    And I click 'teaser-columns-3'
    And I fill 'insp-teaser-title-0' with 'Clinics'
    And I click 'teaser-add'
    And I fill 'insp-teaser-title-2' with 'Car dealers'
    Then the preview should show 3 teasers in one row
    And the preview should show 'Car dealers' in '.teaser-col:last-child .teaser-title'

  Scenario: An event shows the calendar sheet and a Google Calendar link
    Given I open the start page
    And I click the start tile 'start-blank'
    When I drag the catalog card 'event' over the preview content
    And I drop it
    And I open the block editor for the first block
    And I fill 'insp-event-date' with '2026-11-12'
    And I fill 'insp-event-timezone' with 'Europe/Berlin'
    Then the preview should show 'NOV' in '.event-month'
    And the preview should show 'Thursday' in '.event-weekday'
    And the preview should show '10:00 – 10:30 · Online, Microsoft Teams' in '.event-meta'
    And the calendar link should add '20261112T100000/20261112T103000' in 'Europe/Berlin'
    When I click 'event-calendar'
    Then the preview should have no '.event-cal-link'

  Scenario: Every icon in the social folder has a link field
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the Social tab
    Then there should be one social link field per icon in 'public/icons/social'

  Scenario: The × at the end of a text field empties it
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the Social tab
    And I enter the social link 'linkedin' as 'linkedin.com/company/acme'
    Then the preview footer should show the 'LinkedIn' icon
    And the social strip should show 'linkedin'
    When I clear the social link 'linkedin' with the ×
    Then the social link 'linkedin' should read ''
    And the preview footer should not show the 'LinkedIn' icon
    And the social strip should not show 'linkedin'

  Scenario: Social icons need an image address, else the export uses text links
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the Social tab
    And I enter the social link 'linkedin' as 'linkedin.com/company/acme'
    Then the social link 'linkedin' should read 'https://linkedin.com/company/acme'
    And the preview footer should show the 'LinkedIn' icon
    When I open the export dialog
    Then the export should warn that the image address is missing
    When I download the export
    Then the downloaded HTML should link 'LinkedIn' as text
    When I open the export dialog
    And I set the image address to 'https://lists.example.com/uploads'
    And I download the export
    Then the download should be a ZIP with the HTML and 'social/linkedin-' PNG
    And the zipped HTML should show the icon from 'https://lists.example.com/uploads/linkedin-'

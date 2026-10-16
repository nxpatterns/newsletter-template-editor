Feature: Header and footer parts can be switched off one by one

  Scenario: Switching off the imprint hides its link and warns
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the panel tab 'legal'
    And I switch the frame part 'imprint' off
    Then the frame part warning 'imprint' should be visible
    And the preview footer links should not contain 'Imprint'
    And the preview footer links should contain 'Privacy'
    When I switch the frame part 'imprint' on
    Then the preview footer links should contain 'Imprint'

  Scenario: Stars can stay in the footer while the header shows none
    Given I open the start page
    And I click the start tile 'start-blank'
    When I open the panel tab 'brand'
    And I switch the frame part 'starsTop' off
    Then the preview should show no header stars
    And the preview should show footer stars

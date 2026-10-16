Feature: Start page
  The app opens on a start page: a blank newsletter, the German or English demo,
  the draft in progress and the saved newsletters.

  Scenario: First start offers blank first, then the two demos, and nothing recent yet
    Given I open the start page
    Then the start page title should read 'Welcome! How would you like to start?'
    And the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en'
    And there should be no draft to continue
    And the recent list should be empty

  Scenario Outline: A blank newsletter has no blocks, nothing from CloudLib and the app language
    Given I open the start page
    When I switch the app language to '<lang>'
    And I click the start tile 'start-blank'
    Then the editor should show the document '<name>'
    And the editor should have no blocks
    And the preview should contain '<brand>'
    And the preview should contain '<company>'
    And the preview should contain '<privacy>'
    And the preview should not contain 'CloudLib'
    And the preview should show the placeholder logo
    And the Brand tab should call the logo '<logo>'

    Examples:
      | lang | name             | brand           | company                             | privacy     | logo             |
      | en   | New newsletter   | YourCompany.com | Your Company Name · yourcompany.com | Privacy     | Placeholder logo |
      | de   | Neuer Newsletter | IhreFirma.de    | Ihr Firmenname · ihrefirma.de       | Datenschutz | Platzhalter-Logo |

  Scenario Outline: A demo opens as a copy in its language
    Given I open the start page
    When I click the start tile '<tile>'
    Then the editor should show the document '<name>'
    And the preview should contain '<text>'

    Examples:
      | tile          | name                                        | text                                                            |
      | start-demo-de | CloudLib-EU-Example-Newsletter-Template     | Wie betritt man Ihren Betrieb, wenn die Tür geschlossen ist?   |
      | start-demo-en | CloudLib-EU-Example-Newsletter-Template-EN  | How do people walk into your business when the door is closed? |

  Scenario: An opened but untouched demo leaves nothing to continue
    Given I open the start page
    When I click the start tile 'start-demo-en'
    And I go back to the start page
    Then there should be no draft to continue

  Scenario: Unsaved work from last time can be opened or discarded
    Given I open the editor with the German demo
    When I rename the newsletter to 'Unsaved draft'
    And I reopen the app
    Then the start page title should read 'Welcome back'
    And the draft to continue should be 'Unsaved draft'
    And the not saved card should say 'Not saved' and 'Last changed today'
    When I continue the draft
    Then the editor should show the document 'Unsaved draft'
    When I reopen the app
    And I ask to discard the draft
    Then the card should ask 'Really discard this draft? This cannot be undone.'
    When I cancel discarding the draft
    Then the draft to continue should be 'Unsaved draft'
    When I ask to discard the draft
    And I confirm discarding the draft
    Then there should be no draft to continue
    And the recent list should be empty

  Scenario: Discarding unsaved changes keeps the saved newsletter
    Given I open the editor with the German demo
    When I save the template from the file menu
    And I rename the newsletter to 'Changed name'
    And I reopen the app
    Then the draft to continue should be 'Changed name'
    When I ask to discard the draft
    Then the card should ask 'Really discard the changes? The saved version stays.'
    When I confirm discarding the draft
    Then there should be no draft to continue
    And the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: Leaving with unsaved changes asks to save, discard or cancel
    Given I open the editor with the German demo
    When I rename the newsletter to 'Autumn offer'
    And I go back to the start page
    Then I should be asked about unsaved changes
    When I answer the unsaved changes question with 'confirm-cancel'
    Then the editor should show the document 'Autumn offer'
    When I go back to the start page
    And I answer the unsaved changes question with 'confirm-ok'
    And I confirm the name prompt
    Then the recent list should contain 'Autumn offer'
    And there should be no draft to continue
    When I open the recent newsletter 'Autumn offer'
    And I rename the newsletter to 'Thrown away'
    And I go back to the start page
    And I answer the unsaved changes question with 'confirm-alt'
    Then the recent list should contain 'Autumn offer'
    And there should be no draft to continue

  Scenario: Reloading the editor reopens the same newsletter
    Given I open the editor with the German demo
    When I rename the newsletter to 'Reload check'
    And I reload the page
    Then the editor should show the document 'Reload check'
    When I save the template from the file menu
    Then the address should point to a saved newsletter
    When I reload the page
    Then the editor should show the document 'Reload check'

  Scenario: An unknown newsletter address goes to the start page
    Given I open the address '/edit/does-not-exist'
    Then I should see a snackbar with text "This newsletter no longer exists."
    And the start page should be visible

  Scenario: A stored draft without a name gets a neutral name
    Given I open the editor with an extra greeting block
    Then the editor should show the document 'New newsletter'

Feature: Start page
  The app opens on a start page: a blank newsletter, the German or English demo,
  the draft in progress and the saved newsletters.

  Scenario: First start offers blank first, then the two demos, and nothing recent yet
    Given I open the start page
    Then the start page title should read 'Welcome! How would you like to start?'
    And the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en'
    And there should be no draft to continue
    And the recent list should be empty

  Scenario: The demo tiles show the flags of the countries they are written for
    Given I open the start page
    Then the start tile 'start-demo-de' should show the flags 'de,at,ch'
    And the start tile 'start-demo-en' should show the flags 'uk,us,ca,au,nz,ie'

  Scenario: A saved newsletter shows its subject line in the recent list
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    Then the recent newsletter 'CloudLib-EU-Example-Newsletter-Template' should show the subject 'Wie betritt man Ihren Betrieb, wenn die Tür geschlossen ist?'

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
    When I save the template
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

  Scenario: Opening another template with unsaved changes asks to save, discard or cancel
    Given I open the editor with the German demo
    When I rename the newsletter to 'Alpha'
    And I go back to the start page
    And I answer the unsaved changes question with 'confirm-ok'
    And I confirm the name prompt
    And I click the start tile 'start-demo-en'
    And I rename the newsletter to 'Beta'
    And I go back to the start page
    And I answer the unsaved changes question with 'confirm-ok'
    And I confirm the name prompt
    And I open the recent newsletter 'Alpha'
    And I rename the newsletter to 'Gamma'
    And I reopen the app
    And I click the recent newsletter 'Beta'
    Then I should be asked about unsaved changes
    And the unsaved changes question should name 'Gamma' and 'Beta'
    When I answer the unsaved changes question with 'confirm-cancel'
    Then the start page should be visible
    And the draft to continue should be 'Gamma'
    And the not saved card should shake
    When I click the recent newsletter 'Beta'
    And I answer the unsaved changes question with 'confirm-alt'
    Then the editor should show the document 'Beta'
    When I reopen the app
    Then the recent list should contain 'Alpha'
    And there should be no draft to continue
    When I open the recent newsletter 'Beta'
    And I rename the newsletter to 'Delta'
    And I reopen the app
    And I click the recent newsletter 'Alpha'
    And I answer the unsaved changes question with 'confirm-ok'
    Then the editor should show the document 'Alpha'
    When I reopen the app
    Then the recent list should contain 'Delta'

  Scenario: Reloading the editor reopens the same newsletter
    Given I open the editor with the German demo
    When I rename the newsletter to 'Reload check'
    And I reload the page
    Then the editor should show the document 'Reload check'
    When I save the template
    Then the address should point to a saved newsletter
    When I reload the page
    Then the editor should show the document 'Reload check'

  Scenario: An unknown newsletter address offers a new template
    Given I open the address '/edit/does-not-exist'
    Then the not found page should be of kind 'template'
    And the address should end with '/edit/does-not-exist/current-blocks/list'
    When I follow the not found link 'not-found-home'
    Then the start page should be visible

  Scenario: A stored draft without a name gets a neutral name
    Given I open the editor with an extra greeting block
    Then the editor should show the document 'New newsletter'

  Scenario: Deleting a saved template with the corner ×, then undoing it
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I delete the recent newsletter 'CloudLib-EU-Example-Newsletter-Template'
    Then the recent list should be empty
    And the message should say '“CloudLib-EU-Example-Newsletter-Template” deleted'
    When I undo in the message
    Then the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'
    And there should be no draft to continue
    When I reopen the app
    Then the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: A deleted template stays deleted, its open copy stays as not saved
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I delete the recent newsletter 'CloudLib-EU-Example-Newsletter-Template'
    And I close the message
    And I reopen the app
    Then the recent list should be empty
    And the draft to continue should be 'CloudLib-EU-Example-Newsletter-Template'
    And only the demo tiles should have a delete button

  Scenario: Deleting a demo tile with the corner ×, then undoing it
    Given I open the start page
    When I delete the start tile 'start-demo-de'
    Then the start tiles should be in the order 'start-blank,start-demo-en'
    And the message should offer to undo
    When I undo in the message
    Then the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en'
    When I reopen the app
    Then the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en'

  Scenario: Deleting two demo tiles keeps the first undo reachable
    Given I open the start page
    When I delete the start tile 'start-demo-de'
    And I delete the start tile 'start-demo-en'
    Then the message pager should show 2 of 2
    When I page to the older message
    Then the message pager should show 1 of 2
    When I undo in the message
    Then the start tiles should be in the order 'start-blank,start-demo-de'
    And the message should offer to undo
    And the message pager should be hidden

  Scenario: Paging messages under the pointer keeps the timer paused
    Given I open the start page
    When I delete the start tile 'start-demo-de'
    And I delete the start tile 'start-demo-en'
    And I page to the older message
    Then the message pager should show 1 of 2
    And the message timer should be paused
    When I page to the newer message
    Then the message timer should be paused
    When I move the pointer off the message
    Then the message timer should be running

  Scenario: A deleted demo stays deleted and leaves the start page menu
    Given I open the start page
    When I delete the start tile 'start-demo-en'
    And I close the message
    And I reopen the app
    Then the start tiles should be in the order 'start-blank,start-demo-de'
    When I open the start page menu
    Then the start page menu entries should be 'start-menu-blank,start-menu-demo-de,start-menu-open-saved,start-menu-open-file,menu-factory-reset'

  Scenario: A pinned template is a tile after the demos and opens from there
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I pin the recent newsletter 'CloudLib-EU-Example-Newsletter-Template'
    Then the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en,start-pinned'
    And the recent newsletter 'CloudLib-EU-Example-Newsletter-Template' should be shown as pinned
    When I reopen the app
    Then the start tiles should be in the order 'start-blank,start-demo-de,start-demo-en,start-pinned'
    When I click the start tile 'start-pinned'
    Then the editor should show the document 'CloudLib-EU-Example-Newsletter-Template'

  Scenario: Pinned tiles move up when the demos are deleted, unpinning keeps the template
    Given I open the editor with the German demo
    When I save the template
    And I go back to the start page
    And I pin the recent newsletter 'CloudLib-EU-Example-Newsletter-Template'
    And I delete the start tile 'start-demo-de'
    And I close the message
    And I delete the start tile 'start-demo-en'
    And I close the message
    Then the start tiles should be in the order 'start-blank,start-pinned'
    When I unpin the start tile 'CloudLib-EU-Example-Newsletter-Template'
    Then the start tiles should be in the order 'start-blank'
    And the recent list should contain 'CloudLib-EU-Example-Newsletter-Template'
    And the recent newsletter 'CloudLib-EU-Example-Newsletter-Template' should not be pinned

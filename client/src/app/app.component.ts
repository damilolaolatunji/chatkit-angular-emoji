import { Component, AfterViewChecked } from '@angular/core';
import Chatkit from '@pusher/chatkit-client';
import axios from 'axios';
import Giphy from 'giphy-api';
declare const microlink;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewChecked {
  title = 'Angular Chatroom';
  messages = [];
  users = [];
  currentUser: any;
  currentRoom = {};
  showEmojiPicker = false;
  showGiphySearch = false;
  giphySearchTerm = '';
  giphyResults = [];

  _username: string = '';
  get username(): string {
    return this._username;
  }

  set username(value: string) {
    this._username = value;
  }

  _message: string = '';
  get message(): string {
    return this._message;
  }

  set message(value: string) {
    this._message = value;
  }

  ngAfterViewChecked() {
    microlink('.link-preview');
  }

  searchGiphy() {
    const giphy = Giphy();
    const searchTerm = this.giphySearchTerm;
    giphy.search(searchTerm)
      .then(res => {
        console.log(res);
        this.giphyResults = res.data;
      })
      .catch(console.error);
  }

  sendGif(title, url) {
    const { currentUser } = this;
    currentUser.sendMessage({
      text: title,
      roomId: '<your room id>',
      attachment: {
        link: url,
        type: 'image',
      }
    }).catch(console.error);
    this.showGiphySearch = false;
  }

  toggleGiphySearch() {
    this.showGiphySearch = !this.showGiphySearch;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event) {
    const { message } = this;
    const text = `${message}${event.emoji.native}`;

    this.message = text;
    this.showEmojiPicker = false;
  }

  sendMessage() {
    const { message, currentUser } = this;
    currentUser.sendMessage({
      text: message,
      roomId: '<your room id>',
    });

    this.message = '';
  }

  addUser() {
    const { username } = this;
    axios.post('http://localhost:5200/users', { username })
      .then(() => {
        const tokenProvider = new Chatkit.TokenProvider({
          url: 'http://localhost:5200/authenticate'
        });

        const chatManager = new Chatkit.ChatManager({
          instanceLocator: '<your chatkit instance locator>',
          userId: username,
          tokenProvider
        });

        return chatManager
          .connect()
          .then(currentUser => {
            currentUser.subscribeToRoom({
              roomId: '<your room id>',
              messageLimit: 100,
              hooks: {
                onMessage: message => {

                  let { text } = message;
                  const urlMatches = message.text.match(/\b(http|https)?:\/\/\S+/gi) || [];

                  function insertTextAtIndices(text, obj) {
                    return text.replace(/./g, function(character, index) {
                      return obj[index] ? obj[index] + character : character;
                    });
                  }

                  urlMatches.forEach(link => {
                    const startIndex = text.indexOf(link);
                    const endIndex = startIndex + link.length;
                    text = insertTextAtIndices(text, {
                      [startIndex]: `<a href="${link}" target="_blank" rel="noopener noreferrer" class="embedded-link">`,
                      [endIndex]: '</a>',
                    });
                  });

                  this.messages.push({ ...message, text, url_matches: urlMatches, });
                },
                onPresenceChanged: (state, user) => {
                  this.users = currentUser.users.sort((a) => {
                    if (a.presence.state === 'online') return -1;

                    return 1;
                  });
                },
              },
            });

            this.currentUser = currentUser;
            this.users = currentUser.users;

          });
      })
        .catch(error => console.error(error))
  }
}

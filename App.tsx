import React, { Component, useState } from 'react';
import { Text, View, Button, TextInput, Dimensions } from 'react-native';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClustaarWebChatService, WebChannel } from 'clustaar-webchat-sdk';
import {
    AgentReplyMessage,
    BotReplyMessage,
    ControlTakenMessage,
    InterlocutorReplyMessage
} from 'clustaar-webchat-sdk/lib/domain/messages';
import { GiftedChat } from 'react-native-gifted-chat'
import { WEBCHAT_CONFIGURATION } from './constants/configuration'

export default class App extends React.Component<{}, { messages: any[] }> {


    clustaarWebchatSdkService = new ClustaarWebChatService({
        environment: WEBCHAT_CONFIGURATION.ENVIRONMENT
    });
    interlocutorChannel: WebChannel;
    interlocutorChannelSubject: Subject<any>;
    connectionState: string;
    idMessage = 1;
    width;
    height;


    constructor(props) {
        super(props);
        const dimensions = Dimensions.get('window');
        this.state = {
            messages: []
        };

        this.height = dimensions.height;
        this.width = dimensions.width;

        this.clustaarWebchatSdkService.connect();

        this.clustaarWebchatSdkService.onConnectionState().subscribe((connectionState) => {
            this.connectionState = connectionState;
        });

        this.join();

    }

    render() {
        return (
            <View style={{ width: this.width, height: this.height }}>
                <Text>State : {this.connectionState}</Text>
                <TextInput style={{ height: 20, width: 150 }}
                           onChangeText={text => this.setState({ message: text })}
                           value={this.state.message}/>
                <Button title="Join" onPress={() => this.join()}/>
                <Button title="Leave" onPress={() => this.leave()}/>
                <GiftedChat
                    messages={this.state.messages}
                    onSend={messages => this.onSend(messages)}
                    user={{
                        _id: 1,
                    }}
                />
            </View>
        );

    }

    onSend(messages = []) {
        // Add message to chat
        this.setState(previousState => ({
            messages: GiftedChat.append(previousState.messages, messages),
        }));

        // Send message to the websocket.
        const interlocutorMessage: InterlocutorReplyMessage = {
            type: 'text',
            message: messages[0].text
        };

        this.interlocutorChannel.sendReply(WEBCHAT_CONFIGURATION.BOT_TOKEN, interlocutorMessage);
    }

    join() {

        // Initialize interlocutorChannel on join(). If the user logout (leave()), and connect with another account, an another interlocutorChannel is used.
        this.interlocutorChannel = this.clustaarWebchatSdkService.interlocutorChannel({
            botID: WEBCHAT_CONFIGURATION.BOT_ID,
            interlocutorID: WEBCHAT_CONFIGURATION.INTERLOCUTOR_ID,
            socketToken: WEBCHAT_CONFIGURATION.SOCKET_TOKEN
        });

        // Create a subject to be able to destroy interlocutorChannel observables on leave().
        this.interlocutorChannelSubject = new Subject();

        // When we join a channel we subscribe to bot reply, agent reply, take control and interlocutor reply.
        this.interlocutorChannel.join().subscribe((status) => {

            // Subscribe to bot replies and push to chat
            this.interlocutorChannel.onBotReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((botReply: BotReplyMessage) => {
                console.log('botReply:', botReply);
                let textsAction = botReply.fulfillment.actions.filter(action => action.type == 'send_text_action');

                for (let textAction of textsAction) {
                    this.addMessageToChat(textAction.text, 'AGENT')
                }
            });

            // Subscribe to agent replies and push to chat
            this.interlocutorChannel.onAgentReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((agentReply: AgentReplyMessage) => {
                console.log(agentReply, 'agentReply');
                this.addMessageToChat(agentReply.message, 'AGENT')
            });

            // Subscribe to agent take control ( true ) / release controle ( false ) and push to chat.
            this.interlocutorChannel.onControlTaken().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((control: ControlTakenMessage) => {
                console.log(control, 'control');
                if (control && control.value) {
                    this.addMessageToChat('Un agent à rejoint la conversation', 'AGENT')
                } else {
                    this.addMessageToChat('Un agent à quitté la conversation', 'AGENT')
                }
            });

            // Subscribe to interlocutorReply, only received when you push message on another tabs / app with the same interlocutorID
            this.interlocutorChannel.onInterlocutorReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((interlocutorReply: InterlocutorReplyMessage) => {
                console.log(interlocutorReply, 'interlocutorReply');
                this.addMessageToChat(interlocutorReply.message, 'USER')
            });
        });
    }

    leave() {
        this.interlocutorChannel.leave().subscribe(() => {
            this.interlocutorChannelSubject.next();
            this.interlocutorChannelSubject.complete();
        });
    }

    addMessageToChat(text, from) {
        this.idMessage += 1;
        const message = [{
            _id: this.idMessage,
            text: text,
            createdAt: new Date(),
            user: {
                _id: from === 'USER' ? 1 : 2,
                name: from,
                avatar: 'https://placeimg.com/140/140/any',
            },
        }];

        this.setState(previousState => ({
            messages: GiftedChat.append(previousState.messages, message)
        }));

    }
}

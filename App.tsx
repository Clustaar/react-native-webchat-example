import React, { Component, useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, ScrollView, Dimensions } from 'react-native';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClustaarWebChatService, WebChannel } from 'clustaar-webchat-sdk';
import { InterlocutorReplyMessage } from 'clustaar-webchat-sdk/lib/domain/messages';
import { GiftedChat } from 'react-native-gifted-chat'

export default class App extends React.Component<{}, { messages: any[] }> {

    botID = '5b50b57f64a5470032c98636';
    botToken = 'eyJ2YWx1ZSI6ImpncGVmcWh6S1BQUkJBdE1YSHRDYXFyLXJ5blFYU3B0QUZ2LVJFemoxQ00iLCJzdWJqZWN0Ijp7InR5cGUiOiJib3QiLCJpZCI6IjViNTBiNTdmNjRhNTQ3MDAzMmM5ODYzNiJ9fQ==';
    interlocutorID = '5e398d3857d5f3000b82e4c0';
    socketToken = 'melosockmelosockmelosockmelosockmelosockmelosockmelosockmelosockmelosockmelosock';
    clustaarWebchatSdkService = new ClustaarWebChatService({
        environment: 'wss://sockets.staging.clustaar.io/socket'
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
        this.connect();
        this.height = dimensions.height;
        this.width = dimensions.width;

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

        // Send message to the webchat api.
        const interlocutorMessage: InterlocutorReplyMessage = {
            token: this.botToken,
            params: {
                display: true,
                debug: 1
            },
            body: {
                type: 'text',
                message: messages[0].text
            }
        };

        this.interlocutorChannel.sendReply(interlocutorMessage);

    }


    connect() {
        this.clustaarWebchatSdkService.connect();
    }

    join() {

        // Initialize interlocutorChannel
        this.interlocutorChannel = this.clustaarWebchatSdkService.interlocutorChannel({
            botID: this.botID,
            interlocutorID: this.interlocutorID,
            socketToken: this.socketToken
        });

        // Create a subjcet to be able to destroy interlocutorChannel observables on leave().
        this.interlocutorChannelSubject = new Subject();

        // When we join a channel we subscribe to bot reply, agent reply, take control and interlocutor reply.
        this.interlocutorChannel.join().subscribe((status) => {

            // Subscribe to bot replies and push to chat
            this.interlocutorChannel.onBotReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((botReply: any) => {
                console.log('botReply:', botReply);
                let textsAction = botReply.fulfillment.actions.filter(action => action.type == 'send_text_action');

                for(let textAction of textsAction ) {
                    this.addMessageToChat(textAction.text, 'AGENT')
                }
            });

            // Subscribe to agent replies and push to chat
            this.interlocutorChannel.onAgentReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((agentReply: any) => {
                console.log(agentReply, 'agentReply');
                this.addMessageToChat(agentReply.message, 'AGENT')
            });

            // Subscribe to agent take control ( true ) / release controle ( false ) and push to chat.
            this.interlocutorChannel.onControl().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((control) => {
                console.log(control, 'control');
                if (control && control.value) {
                    this.addMessageToChat('Un agent à rejoint la conversation', 'AGENT')
                } else {
                    this.addMessageToChat('Un agent à quitté la conversation', 'AGENT')
                }

            });

            // Subscribe to interlocutorReply, only received when you push message on another tabs / app with the same interlocutorID
            this.interlocutorChannel.onInterlocutorReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((interlocutorReply) => {
                console.log(interlocutorReply, 'interlocutorReply');
                this.addMessageToChat(interlocutorReply.message, 'USER')
                // this.addMessageToChat('', 'USER')
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});








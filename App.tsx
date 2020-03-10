import React, { Component, useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ClustaarWebChatService, WebChannel } from 'clustaar-webchat-sdk';
import { InterlocutorReplyMessage } from 'clustaar-webchat-sdk/lib/domain/messages';


export default class App extends React.Component<{}, { message: string }> {

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

    constructor(props) {
        super(props);

        this.state = { message: '' };
        this.connect();

        this.clustaarWebchatSdkService.onConnectionState().subscribe((connectionState) => {
            this.connectionState = connectionState;
        });
        this.join();
    }

    render() {
        return (
            <View style={styles.container}>
                <Text>React Native Clustaar Webchat SDK POC!</Text>
                <Text>State : {this.connectionState}</Text>
                <TextInput style={{ height: 20, width: 150 }}
                           onChangeText={text => this.setState({ message: text })}
                           value={this.state.message}/>
                <Button title="Send message" onPress={() => this.sendMessage()}/>
                <Button title="Join" onPress={() => this.join()}/>
                <Button title="Leave" onPress={() => this.leave()}/>
            </View>
        );

    }


    connect() {
        this.clustaarWebchatSdkService.connect();
    }

    sendMessage() {
        const interlocutorMessage: InterlocutorReplyMessage = {
            token: this.botToken,
            params: {
                display: true,
                debug: 1
            },
            body: {
                type: 'text',
                message: this.state.message
            }
        };

        this.interlocutorChannel.sendReply(interlocutorMessage);
        this.setState({ message: '' });
    }

    join() {

        this.interlocutorChannel = this.clustaarWebchatSdkService.interlocutorChannel({
            botID: this.botID,
            interlocutorID: this.interlocutorID,
            socketToken: this.socketToken
        });

        this.interlocutorChannelSubject = new Subject();

        this.interlocutorChannel.join().subscribe((status) => {
            console.log(status);
            this.interlocutorChannel.onBotReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((botReply) => {
                console.log(botReply, 'botReply');
            });

            this.interlocutorChannel.onAgentReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((agentReply) => {
                console.log(agentReply, 'agentReply');
            });

            this.interlocutorChannel.onControl().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((control) => {
                console.log(control, 'control');
            });

            this.interlocutorChannel.onInterlocutorReply().pipe(takeUntil(this.interlocutorChannelSubject)).subscribe((interlocutorReply) => {
                console.log(interlocutorReply, 'interlocutorReply');
            });
        });
    }

    leave() {
        this.interlocutorChannel.leave().subscribe(() => {
            this.interlocutorChannelSubject.next();
            this.interlocutorChannelSubject.complete();
        });
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








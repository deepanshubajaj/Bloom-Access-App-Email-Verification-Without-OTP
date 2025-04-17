import React, { useState, useContext } from "react";
import { StatusBar } from 'expo-status-bar';

// formik
import { Formik } from "formik";

// icons
import { Octicons, Ionicons, Fontisto } from '@expo/vector-icons';

import {
    StyledContainer,
    InnerContainer,
    PageTitle,
    SubTitle,
    StyledFormArea,
    LeftIcon,
    StyledInputLabel,
    StyledTextInput,
    RightIcon,
    StyledButton,
    ButtonText,
    Colors,
    MsgBox,
    Line,
    ExtraView,
    ExtraText,
    TextLink,
    TextLinkContent
} from './../components/styles';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';

// colors
const { brand, darkLight, primary } = Colors;

// Datetimepicker
import DateTimePicker from '@react-native-community/datetimepicker';

// keyboard avoiding view
import KeyboardAvoidingWrapper from './../components/KeyboardAvoidingWrapper';

// API Client
import axios from 'axios';

// Async-Storage
import AsyncStorage from '@react-native-async-storage/async-storage';

// Credentials Context
import { CredentialsContext } from './../components/CredentialsContext';

// Api Route
import { baseAPIUrl } from "../components/shared";

const Signup = ({ navigation }) => {
    const [hidePassword, setHidePassword] = useState(true);
    const [show, setShow] = useState(false);
    const [date, setDate] = useState(new Date(2000, 0, 1));

    const [message, setMessage] = useState();
    const [messageType, setMessageType] = useState();

    // Actual dob value to be sent
    const [dob, setDob] = useState(new Date(2000, 0, 1));

    // Credentials Context
    const { storedCredentials, setStoredCredentials } = useContext(CredentialsContext);

    const onChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShow(false);
        setDate(currentDate);
        setDob(currentDate);
    };

    const showDatePicker = () => {
        setShow('date');
    };

    // Form Handling
    const handleSignup = (credentials, setSubmitting) => {
        handleMessage(null);
        const url = `${baseAPIUrl}/user/signup`;

        axios
            .post(url, credentials)
            .then((response) => {
                const result = response.data;
                const { message, status, data } = result;

                if (status !== 'PENDING') {
                    handleMessage(message, status);
                } else {
                    navigation.navigate('Verification', { ...data });
                    //persistLogin({ ...data }, message, status);
                }
                setSubmitting(false);
            })
            .catch(error => {
                console.log(error.response ? error.response.data : error.message);
                //console.log(error.JSON());
                setSubmitting(false);
                handleMessage("An error occurred. Check your network and try again");
            });
    }

    const handleMessage = (message, type = '') => {
        setMessage(message);
        setMessageType(type);
    };

    // Persisting login
    const persistLogin = (credentials, message, status) => {
        AsyncStorage.setItem('bloomAccessCredentials', JSON.stringify(credentials))
            .then(() => {
                handleMessage(message, status);
                setStoredCredentials(credentials);
            })
            .catch((error) => {
                handleMessage('Persisting login failed');
                console.log(error);
            });
    };

    return (
        <KeyboardAvoidingWrapper>
            <StyledContainer>
                <StatusBar style="dark" />
                <InnerContainer>
                    <PageTitle>Bloom Access</PageTitle>
                    <SubTitle> Account Signup</SubTitle>

                    {show && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            is24Hour={true}
                            display="default"
                            onChange={onChange}
                            style={{
                                backgroundColor: 'yellow',
                            }}
                        />
                    )}

                    <Formik
                        initialValues={{ name: '', email: '', dateOfBirth: '', password: '', ConfirmPassword: '' }}
                        onSubmit={(values, { setSubmitting }) => {
                            values = { ...values, dateOfBirth: dob };
                            if (values.email == '' || values.password == '' || values.name == '' || values.dateOfBirth == '' || values.ConfirmPassword == '') {
                                handleMessage('Please fill all the fields');
                                setSubmitting(false)
                            } else if (values.password !== values.ConfirmPassword) {
                                handleMessage('Paswords do not match');
                                setSubmitting(false)
                            } else {
                                handleSignup(values, setSubmitting);
                            }
                        }}
                    >{({ handleChange, handleBlur, handleSubmit, values, isSubmitting }) => (<StyledFormArea>
                        <MyTextInput
                            label="Full Name"
                            icon="person"
                            placeholder="John Doe"
                            placeholderTextColor={darkLight}
                            onChangeText={handleChange('name')}
                            onBlur={handleBlur('name')}
                            value={values.name}
                        />

                        <MyTextInput
                            label="Email Address"
                            icon="mail"
                            placeholder="example@gmail.com"
                            placeholderTextColor={darkLight}
                            onChangeText={text => handleChange('email')(text.toLowerCase())}
                            onBlur={handleBlur('email')}
                            value={values.email}
                            keyboardType="email-address"
                        />

                        <MyTextInput
                            label="Date of Birth"
                            icon="calendar"
                            placeholder="YYYY - MM - DD"
                            placeholderTextColor={darkLight}
                            onChangeText={handleChange('dateOfBirth')}
                            onBlur={handleBlur('dateOfBirth')}
                            value={dob ? dob.toDateString() : ''}
                            isDate={true}
                            editable={false}
                            showDatePicker={showDatePicker} />

                        <MyTextInput
                            label="Password"
                            icon="lock"
                            placeholder="* * * * * * * *"
                            placeholderTextColor={darkLight}
                            onChangeText={handleChange('password')}
                            onBlur={handleBlur('password')}
                            value={values.password}
                            secureTextEntry={hidePassword}
                            isPassword={true}
                            hidePassword={hidePassword}
                            setHidePassword={setHidePassword}
                        />

                        <MyTextInput
                            label="Confirm Password"
                            icon="lock"
                            placeholder="* * * * * * * *"
                            placeholderTextColor={darkLight}
                            onChangeText={handleChange('ConfirmPassword')}
                            onBlur={handleBlur('ConfirmPassword')}
                            value={values.ConfirmPassword}
                            secureTextEntry={hidePassword}
                            isPassword={true}
                            hidePassword={hidePassword}
                            setHidePassword={setHidePassword}
                        />

                        <MsgBox type={messageType}>{message}</MsgBox>

                        {!isSubmitting && (
                            <StyledButton onPress={handleSubmit}>
                                <ButtonText>Signup</ButtonText>
                            </StyledButton>
                        )}

                        {isSubmitting && (
                            <StyledButton disabled={true}>
                                <ActivityIndicator size="large" color={primary} />
                            </StyledButton>
                        )}

                        <Line />
                        <ExtraView>
                            <ExtraText>Already have an account? </ExtraText>
                            <TextLink onPress={() => navigation.navigate('Login')}>
                                <TextLinkContent>Login</TextLinkContent>
                            </TextLink>
                        </ExtraView>
                    </StyledFormArea>
                    )}
                    </Formik>
                </InnerContainer>
            </StyledContainer>
        </KeyboardAvoidingWrapper>
    );
}

const MyTextInput = ({ label, icon, isPassword, hidePassword, setHidePassword, isDate, showDatePicker, ...props }) => {
    return (
        <View>
            <LeftIcon>
                <Octicons name={icon} size={30} color={brand} />
            </LeftIcon>
            <StyledInputLabel>{label}</StyledInputLabel>
            {!isDate && <StyledTextInput {...props} />}
            {isDate && (
                <TouchableOpacity onPress={showDatePicker}>
                    <StyledTextInput {...props} />
                </TouchableOpacity>
            )}
            {isPassword && (
                <RightIcon onPress={() => setHidePassword(!hidePassword)}>
                    <Ionicons name={hidePassword ? 'eye-off' : 'eye'} size={30} color={darkLight} />
                </RightIcon>
            )}
        </View>
    );
}

export default Signup;
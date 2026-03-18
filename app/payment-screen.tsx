import React, { useState } from "react";
import {
View,
Text,
StyleSheet,
TextInput,
TouchableOpacity,
ScrollView,
KeyboardAvoidingView,
Platform,
Keyboard,
TouchableWithoutFeedback,
Animated,
Image
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";

const cardLogos:any = {
  Visa: require("../assets/cards/visa.png"),
  MasterCard: require("../assets/cards/mastercard.png"),
  "American Express": require("../assets/cards/amex.png"),
};

export default function PaymentScreen(){

const [cardType,setCardType] = useState("Visa");
const [cardNumber,setCardNumber] = useState("");
const [holder,setHolder] = useState("");
const [expiry,setExpiry] = useState("");
const [cvv,setCvv] = useState("");

const flipAnim = useState(new Animated.Value(0))[0];

const frontRotate = flipAnim.interpolate({
inputRange:[0,180],
outputRange:["0deg","180deg"]
});

const backRotate = flipAnim.interpolate({
inputRange:[0,180],
outputRange:["180deg","360deg"]
});

function flipFront(){
Animated.timing(flipAnim,{
toValue:0,
duration:400,
useNativeDriver:true
}).start();
}

function flipBack(){
Animated.timing(flipAnim,{
toValue:180,
duration:400,
useNativeDriver:true
}).start();
}

function formatCard(text:string){
let clean=text.replace(/\D/g,"");
let groups=clean.match(/.{1,4}/g);
return groups?groups.join(" "):"";
}

function handleCardNumber(text:string){
let formatted=formatCard(text);

if(cardType==="American Express"){
formatted=formatted.slice(0,17);
}else{
formatted=formatted.slice(0,19);
}

setCardNumber(formatted);
}

function handleCVV(text:string){
let max=cardType==="American Express"?4:3;
setCvv(text.slice(0,max));
}

function validateLuhn(card:string){

let num=card.replace(/\s/g,"");
let sum=0;
let double=false;

for(let i=num.length-1;i>=0;i--){

let digit=parseInt(num.charAt(i));

if(double){
digit*=2;
if(digit>9) digit-=9;
}

sum+=digit;
double=!double;

}

return sum%10===0;
}

function getGradient():[string,string,string]{

switch(cardType){

case "Visa":
return ["#7F7FD5","#86A8E7","#91EAE4"];

case "MasterCard":
return ["#141E30","#243B55","#0F2027"];

case "American Express":
return ["#56CCF2","#2F80ED","#1C92D2"];

default:
return ["#7F7FD5","#86A8E7","#91EAE4"];

}
}

function handlePay(){

if(!validateLuhn(cardNumber)){
alert("Invalid Card Number");
return;
}

alert("Payment Successful 🎉");
}

return(

<KeyboardAvoidingView
style={{flex:1}}
behavior={Platform.OS==="ios"?"padding":undefined}
>

<TouchableWithoutFeedback onPress={Keyboard.dismiss}>

<View style={styles.container}>

<Header title="Payment"/>

<ScrollView contentContainerStyle={styles.content}>

{/* CARD PREVIEW */}

<View style={styles.cardContainer}>

<Animated.View
style={[styles.card,{transform:[{rotateY:frontRotate}]}]}
>

<LinearGradient
colors={getGradient()}
style={styles.cardGradient}
>

<Image
source={cardLogos[cardType]}
style={styles.cardLogo}
resizeMode="contain"
/>

<Text style={styles.number}>
{cardNumber || "XXXX XXXX XXXX XXXX"}
</Text>

<View style={styles.cardRow}>

<View>

<Text style={styles.labelSmall}>
CARD HOLDER
</Text>

<Text style={styles.value}>
{holder || "YOUR NAME"}
</Text>

</View>

<View>

<Text style={styles.labelSmall}>
EXPIRES
</Text>

<Text style={styles.value}>
{expiry || "MM/YY"}
</Text>

</View>

</View>

</LinearGradient>

</Animated.View>


{/* BACK CARD */}

<Animated.View
style={[styles.cardBack,{transform:[{rotateY:backRotate}]}]}
>

<View style={styles.strip}/>

<Text style={styles.cvv}>
{cvv || "***"}
</Text>

</Animated.View>

</View>


{/* CARD TYPE SELECTOR */}

<Text style={styles.label}>Card Type</Text>

<View style={styles.selector}>

{["Visa","MasterCard","American Express"].map(type=>(

<TouchableOpacity
key={type}
style={[
styles.typeBtn,
cardType===type && styles.typeSelected
]}
onPress={()=>setCardType(type)}
>

<Image
source={cardLogos[type]}
style={styles.selectorLogo}
resizeMode="contain"
/>

<Text
style={[
styles.typeText,
cardType===type && {color:"#fff"}
]}
>
{type==="American Express"?"AMEX":type}
</Text>

</TouchableOpacity>

))}

</View>


{/* CARD NUMBER */}

<Text style={styles.label}>Card Number</Text>

<TextInput
style={styles.input}
keyboardType="numeric"
value={cardNumber}
onChangeText={handleCardNumber}
placeholder="1234 5678 9012 3456"
/>


{/* HOLDER */}

<Text style={styles.label}>Card Holder</Text>

<TextInput
style={styles.input}
value={holder}
onChangeText={setHolder}
placeholder="John Doe"
/>


{/* EXPIRY + CVV */}

<View style={styles.row}>

<View style={styles.half}>

<Text style={styles.label}>Expiry</Text>

<TextInput
style={styles.input}
value={expiry}
placeholder="MM/YY"
onChangeText={setExpiry}
onFocus={flipFront}
/>

</View>

<View style={styles.half}>

<Text style={styles.label}>CVV</Text>

<TextInput
style={styles.input}
value={cvv}
placeholder={cardType==="American Express"?"1234":"123"}
keyboardType="numeric"
onFocus={flipBack}
onBlur={flipFront}
onChangeText={handleCVV}
/>

</View>

</View>


{/* PAY BUTTON */}

<TouchableOpacity
style={styles.payBtn}
onPress={handlePay}
>

<Text style={styles.payText}>
PROCEED TO PAY
</Text>

</TouchableOpacity>

</ScrollView>

</View>

</TouchableWithoutFeedback>

</KeyboardAvoidingView>

);
}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f5f6fa"
},

content:{
padding:20
},

cardContainer:{
height:200,
marginBottom:30
},

card:{
position:"absolute",
width:"100%",
height:200,
backfaceVisibility:"hidden"
},

cardGradient:{
flex:1,
borderRadius:20,
padding:20,
justifyContent:"space-between",
elevation:10
},

cardLogo:{
width:70,
height:40,
alignSelf:"flex-end"
},

cardBack:{
position:"absolute",
width:"100%",
height:200,
backgroundColor:"#1e293b",
borderRadius:20,
padding:20,
backfaceVisibility:"hidden"
},

strip:{
height:40,
backgroundColor:"#000",
marginBottom:20
},

cvv:{
color:"#fff",
alignSelf:"flex-end",
fontSize:18
},

number:{
color:"#fff",
fontSize:22,
letterSpacing:3
},

cardRow:{
flexDirection:"row",
justifyContent:"space-between"
},

labelSmall:{
color:"#ddd",
fontSize:10
},

value:{
color:"#fff",
fontSize:16,
fontWeight:"600"
},

label:{
fontWeight:"600",
marginTop:15,
marginBottom:5
},

input:{
backgroundColor:"#fff",
padding:14,
borderRadius:10,
borderWidth:1,
borderColor:"#e5e7eb"
},

row:{
flexDirection:"row",
justifyContent:"space-between"
},

half:{
width:"48%"
},

selector:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:10
},

selectorLogo:{
width:35,
height:20,
marginBottom:4
},

typeBtn:{
borderWidth:1,
borderColor:"#ccc",
padding:10,
borderRadius:10,
width:"30%",
alignItems:"center"
},

typeSelected:{
backgroundColor:"#6C5CE7",
borderColor:"#6C5CE7"
},

typeText:{
fontWeight:"600"
},

payBtn:{
backgroundColor:"#6C5CE7",
padding:16,
borderRadius:14,
alignItems:"center",
marginTop:30
},

payText:{
color:"#fff",
fontWeight:"bold",
fontSize:16
}

});
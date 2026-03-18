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
Image,
Switch
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { Header } from "../components/Header";

const cardLogos:any = {
  Visa: require("../assets/cards/visa.png"),
  MasterCard: require("../assets/cards/mastercard.png"),
  "American Express": require("../assets/cards/amex.png"),
};

const chip = require("../assets/cards/chip.png");
const nfc = require("../assets/cards/nfc.png");

export default function PaymentScreen(){

const [cardType,setCardType] = useState("Visa");
const [cardNumber,setCardNumber] = useState("");
const [holder,setHolder] = useState("");
const [expiry,setExpiry] = useState("");
const [cvv,setCvv] = useState("");
const [saveCard,setSaveCard] = useState(false);

// animations
const flipAnim = useState(new Animated.Value(0))[0];
const tilt = useState(new Animated.Value(0))[0];

// flip
const frontRotate = flipAnim.interpolate({
inputRange:[0,180],
outputRange:["0deg","180deg"]
});

const backRotate = flipAnim.interpolate({
inputRange:[0,180],
outputRange:["180deg","360deg"]
});

// tilt effect
const tiltRotate = tilt.interpolate({
inputRange:[-1,1],
outputRange:["-5deg","5deg"]
});

function handleTilt(x:number){
Animated.spring(tilt,{
toValue:x,
useNativeDriver:true
}).start();
}

// flip functions
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

// auto detect card type
function detectCardType(num:string){
const cleaned=num.replace(/\s/g,"");

if(/^4/.test(cleaned)) return "Visa";
if(/^5[1-5]/.test(cleaned)) return "MasterCard";
if(/^3[47]/.test(cleaned)) return "American Express";

return "Visa";
}

// format
function formatCard(text:string){
let clean=text.replace(/\D/g,"");
let groups=clean.match(/.{1,4}/g);
return groups?groups.join(" "):"";
}

// card input
function handleCardNumber(text:string){

let formatted=formatCard(text);
let detected=detectCardType(formatted);

setCardType(detected);

if(detected==="American Express"){
formatted=formatted.slice(0,17);
}else{
formatted=formatted.slice(0,19);
}

setCardNumber(formatted);
}

// cvv
function handleCVV(text:string){
let max=cardType==="American Express"?4:3;
setCvv(text.slice(0,max));
}

// gradient
function getGradient():[string,string,string]{

switch(cardType){

case "Visa":
return ["#667eea","#764ba2","#6B73FF"];

case "MasterCard":
return ["#f12711","#f5af19","#f7971e"];

case "American Express":
return ["#00c6ff","#0072ff","#00d2ff"];

default:
return ["#667eea","#764ba2","#6B73FF"];

}
}

// pay
function handlePay(){

alert(
`Payment Successful 🎉
Save Card: ${saveCard ? "YES" : "NO"}`
);

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

{/* CARD */}

<View
style={styles.cardContainer}
onTouchMove={(e)=>{
const x=e.nativeEvent.locationX;
handleTilt(x>150?1:-1);
}}
onTouchEnd={()=>handleTilt(0)}
>

{/* FRONT */}

<Animated.View
style={[
styles.card,
{
transform:[
{rotateY:frontRotate},
{rotateZ:tiltRotate}
]
}
]}
>

<LinearGradient colors={getGradient()} style={styles.cardGradient}>

{/* TOP ROW */}
<View style={styles.topRow}>

<Image source={chip} style={styles.chip}/>

<Image source={nfc} style={styles.nfc}/>

<Image source={cardLogos[cardType]} style={styles.cardLogo}/>

</View>

<Text style={styles.number}>
{cardNumber || "XXXX XXXX XXXX XXXX"}
</Text>

<View style={styles.cardRow}>

<View>
<Text style={styles.labelSmall}>CARD HOLDER</Text>
<Text style={styles.value}>{holder || "YOUR NAME"}</Text>
</View>

<View>
<Text style={styles.labelSmall}>EXPIRES</Text>
<Text style={styles.value}>{expiry || "MM/YY"}</Text>
</View>

</View>

</LinearGradient>

</Animated.View>

{/* BACK */}

<Animated.View
style={[
styles.cardBack,
{transform:[{rotateY:backRotate}]}
]}
>

<View style={styles.strip}/>

<Text style={styles.cvv}>{cvv || "***"}</Text>

</Animated.View>

</View>

{/* CARD TYPE */}

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
/>

<Text style={[
styles.typeText,
cardType===type && {color:"#fff"}
]}>
{type==="American Express"?"AMEX":type}
</Text>

</TouchableOpacity>

))}

</View>

{/* INPUTS */}

<Text style={styles.label}>Card Number</Text>

<TextInput
style={styles.input}
keyboardType="numeric"
value={cardNumber}
onChangeText={handleCardNumber}
/>

<Text style={styles.label}>Card Holder</Text>

<TextInput
style={styles.input}
value={holder}
onChangeText={setHolder}
/>

<View style={styles.row}>

<View style={styles.half}>

<Text style={styles.label}>Expiry</Text>

<TextInput
style={styles.input}
value={expiry}
onFocus={flipFront}
onChangeText={setExpiry}
/>

</View>

<View style={styles.half}>

<Text style={styles.label}>CVV</Text>

<TextInput
style={styles.input}
value={cvv}
keyboardType="numeric"
onFocus={flipBack}
onBlur={flipFront}
onChangeText={handleCVV}
/>

</View>

</View>

{/* SAVE CARD */}

<View style={styles.saveRow}>

<Text style={{fontWeight:"600"}}>Save Card</Text>

<Switch
value={saveCard}
onValueChange={setSaveCard}
/>

</View>

{/* PAY */}

<TouchableOpacity style={styles.payBtn} onPress={handlePay}>
<Text style={styles.payText}>PAY NOW</Text>
</TouchableOpacity>

</ScrollView>

</View>

</TouchableWithoutFeedback>

</KeyboardAvoidingView>

);
}

const styles=StyleSheet.create({

container:{flex:1,backgroundColor:"#c2d2db"},
content:{padding:20},

cardContainer:{height:200,marginBottom:30},

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
justifyContent:"space-between"
},

topRow:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

chip:{width:50,height:35},
nfc:{width:30,height:25},

cardLogo:{width:60,height:35},

cardBack:{
position:"absolute",
width:"100%",
height:200,
backgroundColor:"#1e293b",
borderRadius:20,
padding:20,
backfaceVisibility:"hidden"
},

strip:{height:40,backgroundColor:"#000",marginBottom:20},

cvv:{color:"#fff",alignSelf:"flex-end",fontSize:18},

number:{color:"#fff",fontSize:22,letterSpacing:3},

cardRow:{flexDirection:"row",justifyContent:"space-between"},

labelSmall:{color:"#ddd",fontSize:10},
value:{color:"#fff",fontSize:16,fontWeight:"600"},

label:{fontWeight:"600",marginTop:15,marginBottom:5},

input:{
backgroundColor:"#fff",
padding:14,
borderRadius:10,
borderWidth:1,
borderColor:"#e5e7eb"
},

row:{flexDirection:"row",justifyContent:"space-between"},
half:{width:"48%"},

selector:{flexDirection:"row",justifyContent:"space-between"},
selectorLogo:{width:35,height:20},

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

typeText:{fontWeight:"600"},

saveRow:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginTop:20
},

payBtn:{
backgroundColor:"#6C5CE7",
padding:16,
borderRadius:14,
alignItems:"center",
marginTop:20
},

payText:{color:"#fff",fontWeight:"bold",fontSize:16}

});
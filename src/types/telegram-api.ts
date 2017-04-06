declare namespace TelegramApi {
    interface Update {
        update_id : number;
        message? : Message;
        edited_message? : Message;
        channel_post? : Message;
        edited_channel_post? : Message;
    }

    interface User {
        id : number;
        first_name : string;
        last_name? : string;
        username? : string
    }

    interface Chat {
        id : number;
        type : "private" | "group" | "supergroup" | "channel";
        title? : string;
        username? : string;
        first_name? : string;
        last_name? : string;
        all_members_are_administrators? : boolean
    }

    interface Message {
        message_id : number;
        from? : User;
        date : number;
        chat : Chat;
        forward_from? : User;
        forward_from_chat? : Chat;
        forward_from_message_id? : number;
        forward_date? : number;
        reply_to_message? : Message;
        edit_date? : number;
        text? : string;
        entities? : Array<MessageEntity>;
        audio? : Audio;
        document? : Document;
        game? : Game;
        photo? : Array<PhotoSize>;
        sticker? : Sticker;
        video? : Video;
        voice? : Voice;
        caption? : string;
        contact? : Contact;
        location? : Location;
        venue? : Venue;
        new_chat_member? : User;
        left_chat_member? : User;
        new_chat_title? : string;
        new_chat_photo? : Array<PhotoSize>;
        delete_chat_photo? : true;
        group_chat_created? : true;
        supergroup_chat_created? : true;
        channel_chat_created? : true;
        migrate_to_chat_id? : number;
        migrate_from_chat_id? : number;
        pinned_message? : Message
    }

    interface MessageEntity {
        type : string;
        offset : number;
        length : number;
        url? : string;
        user? : User
    }

    interface PhotoSize {
        file_id : string;
        width : number;
        height : number;
        file_size? : number
    }

    interface Audio {
        file_id : string;
        thumb? : PhotoSize;
        file_name? : string;
        mime_type? : string;
        file_size? : number
    }

    interface Document {
        file_id : string;
        thumb? : PhotoSize;
        file_name? : string;
        mime_type? : string;
        file_size? : number
    }

    interface Sticker {
        file_id : string;
        width : number;
        height : number;
        thumb? : PhotoSize;
        emoji? : string;
        file_size? : number
    }

    interface Video {
        file_id : string;
        width : number;
        height : number;
        duration : number;
        thumb? : PhotoSize;
        mime_type? : string;
        file_size? : number
    }

    interface Voice {
        file_id : string;
        duration : number;
        mime_type? : string;
        file_size? : number;
    }

    interface Contact {
        phone_number : string;
        first_name : string;
        last_name? : string;
        user_id? : number;
    }

    interface Location {
        longitude : number;
        latitude : number;
    }

    interface Venue {
        location : Location;
        title : string;
        address : string;
        foursquare_id? : string;
    }

    interface UserProfilePhotos {
        total_count : number;
        photos : Array< Array<PhotoSize> >;
    }

    /**
     * https://api.telegram.org/file/bot<token>/<file_path>
     */
    interface File {
        file_id : string;
        file_size? : number;
        file_path? : string;
    }

    interface ChatMember {
        user : User;
        status : "creator" | "administrator" | "member" | "left" | "kicked";
    }

    interface ResponseParameters {
        migrate_to_chat_id? : number;
        retry_after? : number;
    }

    interface Game {

    }
}

export default TelegramApi;
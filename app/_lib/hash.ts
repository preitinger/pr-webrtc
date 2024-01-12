import {sha512} from 'js-sha512'

export function transformPasswd(user: string, passwd: string) {
    const pepper = "Wonderful-pepper-206638-yes, we use this :-)"
    return sha512(sha512(sha512(passwd) + user) + pepper)
}

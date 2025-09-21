import * as bcrypt from 'bcryptjs'
import { firestore } from './firestore'  // 修改：从 db 改为 firestore
import { FirestoreUser, UserRegistrationRequest, UserLoginRequest } from '../types/firestore'
import { FieldValue } from '@google-cloud/firestore'

/**
 * 用户服务类 - 处理用户注册、登录、验证等操作
 */
export class UserService {
    private static readonly USERS_COLLECTION = 'users'
    private static readonly SALT_ROUNDS = 12 // bcrypt 盐值轮数

    /**
     * 用户注册
     * @param userData 用户注册数据
     * @returns 创建的用户信息（不包含密码哈希）
     */
    static async registerUser(userData: UserRegistrationRequest): Promise<Omit<FirestoreUser, 'passwordHash'>> {
        const { username, password, displayName, secret } = userData

        // 验证注册密钥
        const appSecretKey = process.env.APP_SECRET_KEY
        if (!appSecretKey) {
            throw new Error('系统配置错误：缺少注册密钥配置')
        }
        
        if (secret !== appSecretKey) {
            throw new Error('注册密钥错误，请联系管理员获取正确的注册密钥')
        }

        // 检查用户名是否已存在
        const existingUser = await this.findUserByUsername(username)
        if (existingUser) {
            throw new Error('用户名已存在')
        }

        // 使用标准 bcrypt 加密密码
        // bcrypt 会自动生成随机盐值，无需手动拼接额外的盐值
        const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS)

        // 创建用户文档（不再存储registrationSecret）
        const userDoc = {
            username,
            passwordHash,
            displayName: displayName || username,
            provider: 'credentials' as const,  // 标记为用户名密码登录
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastLoginAt: null,
            isActive: true
        }

        // 保存到 Firestore，使用用户名作为文档ID
        await firestore.collection(this.USERS_COLLECTION).doc(username).set(userDoc)  // 修改：使用用户名作为文档ID
        
        // 返回用户信息（不包含密码哈希）
        const { passwordHash: _, ...userInfo } = userDoc
        return {
            id: username,  // 使用用户名作为ID
            ...userInfo,
            provider: 'credentials' as const,  // 添加 provider 字段
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }

    /**
     * 验证用户登录凭据
     * @param loginData 登录数据（包含用户名和密码）
     * @returns 验证成功的用户信息（不包含密码哈希）
     */
    static async authenticateUser(loginData: UserLoginRequest): Promise<Omit<FirestoreUser, 'passwordHash'>> {
        const { username, password } = loginData

        // 1. 查找用户
        const user = await this.findUserByUsername(username)
        if (!user) {
            throw new Error('用户名或密码错误')
        }

        // 2. 检查账户是否激活
        if (!user.isActive) {
            throw new Error('账户已被禁用')
        }

        // 3. 验证密码
        if (!user.passwordHash) {
            throw new Error('该账户不支持密码登录')
        }

        // 4. 使用 bcrypt.compare 验证密码
        // bcrypt.compare 会自动处理盐值验证，无需手动拼接或哈希
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
        if (!isPasswordValid) {
            throw new Error('用户名或密码错误')
        }

        // 5. 更新最后登录时间
        await this.updateLastLoginTime(username)

        // 6. 返回用户信息（不包含密码哈希）
        const { passwordHash: _, ...userWithoutPassword } = user
        return userWithoutPassword
    }

    /**
     * 根据用户名查找用户
     * @param username 用户名
     * @returns 用户信息或 null
     */
    static async findUserByUsername(username: string): Promise<FirestoreUser | null> {
        try {
            const userDoc = await firestore.collection(this.USERS_COLLECTION).doc(username).get()  // 修改：db 改为 firestore
            if (!userDoc.exists) {
                return null
            }
            const userData = userDoc.data() as Omit<FirestoreUser, 'id'>
            return {
                id: username,  // 添加ID字段
                ...userData
            } as FirestoreUser
        } catch (error) {
            console.error('查找用户失败:', error)
            return null
        }
    }

    /**
     * 根据邮箱查找用户（用于 Google 登录）
     * @param email 邮箱
     * @returns 用户信息或 null
     */
    static async findUserByEmail(email: string): Promise<FirestoreUser | null> {
        try {
            const querySnapshot = await firestore.collection(this.USERS_COLLECTION)  // 修改：db 改为 firestore
                .where('email', '==', email)
                .limit(1)
                .get()
            
            if (querySnapshot.empty) {
                return null
            }
            
            return querySnapshot.docs[0].data() as FirestoreUser
        } catch (error) {
            console.error('根据邮箱查找用户失败:', error)
            return null
        }
    }

    /**
     * 创建或更新 Google 用户
     * @param googleUser Google 用户信息
     * @returns 用户信息
     */
    static async createOrUpdateGoogleUser(googleUser: {
        id: string
        email: string
        name: string
        image?: string
    }): Promise<Omit<FirestoreUser, 'passwordHash'>> {
        const userRef = firestore.collection(this.USERS_COLLECTION).doc(googleUser.id)  // 修改：db 改为 firestore
        const userDoc = await userRef.get()

        const userData: FirestoreUser = {
            email: googleUser.email,
            displayName: googleUser.name,
            provider: 'google',
            photoURL: googleUser.image,
            isActive: true,
            lastLoginAt: FieldValue.serverTimestamp(),
            createdAt: userDoc.exists ? userDoc.data()?.createdAt : FieldValue.serverTimestamp()
        }

        await userRef.set(userData, { merge: true })

        const { passwordHash: _, ...userWithoutPassword } = userData
        return {
            ...userWithoutPassword,
            createdAt: userDoc.exists ? userDoc.data()?.createdAt : new Date(),
            lastLoginAt: new Date()
        }
    }

    /**
     * 更新用户最后登录时间
     * @param username 用户名
     */
    private static async updateLastLoginTime(username: string): Promise<void> {
        try {
            await firestore.collection(this.USERS_COLLECTION).doc(username).update({  // 修改：db 改为 firestore
                lastLoginAt: FieldValue.serverTimestamp()
            })
        } catch (error) {
            console.error('更新最后登录时间失败:', error)
            // 不抛出错误，因为这不是关键操作
        }
    }

    /**
     * 检查用户名是否可用
     * @param username 用户名
     * @returns 是否可用
     */
    static async isUsernameAvailable(username: string): Promise<boolean> {
        const user = await this.findUserByUsername(username)
        return user === null
    }
}